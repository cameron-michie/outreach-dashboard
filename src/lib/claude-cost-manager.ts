import { env } from './env';

// Cost management and rate limiting for Claude AI operations
export interface CostEstimate {
  email_generation: {
    cost_per_email: number;
    total_emails: number;
    total_cost: number;
  };
  research?: {
    cost_per_company: number;
    companies: number;
    total_cost: number;
  };
  grand_total: number;
  current_balance: number;
  sufficient_credits: boolean;
}

export interface GenerationRequest {
  account_ids: string[];
  email_sequences: number[];
  include_research?: boolean;
}

export interface RateLimitInfo {
  requests_remaining: number;
  reset_time: Date;
  daily_limit: number;
  daily_used: number;
}

export class ClaudeCostManager {
  // Cost constants (per request estimates)
  private static readonly COST_PER_EMAIL = 0.03; // $0.03 per email generation
  private static readonly COST_PER_RESEARCH = 0.15; // $0.15 per company research
  private static readonly COST_WARNING_THRESHOLD = parseFloat(env.claude.costWarningThreshold || '5.00');
  private static readonly APPROVAL_REQUIRED_THRESHOLD = parseFloat(env.claude.approvalThreshold || '10.00');

  // Rate limiting constants
  private static readonly RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
  private static readonly MAX_REQUESTS_PER_MINUTE = parseInt(env.claude.rateLimitPerMinute || '10');
  private static readonly DAILY_LIMIT = parseInt(env.claude.dailyLimit || '100');

  // In-memory rate limiting (production should use Redis)
  private static requestLog: Map<string, number[]> = new Map();
  private static dailyUsage: Map<string, { date: string; count: number }> = new Map();

  /**
   * Estimate costs for a generation request
   */
  static estimateCosts(request: GenerationRequest): CostEstimate {
    const totalEmails = request.account_ids.length * request.email_sequences.length;
    const emailCost = totalEmails * this.COST_PER_EMAIL;

    let researchCost = 0;
    if (request.include_research) {
      researchCost = request.account_ids.length * this.COST_PER_RESEARCH;
    }

    const grandTotal = emailCost + researchCost;

    // Mock current balance - in production this would come from Claude API
    const currentBalance = parseFloat(env.claude.mockBalance || '12.45');

    return {
      email_generation: {
        cost_per_email: this.COST_PER_EMAIL,
        total_emails: totalEmails,
        total_cost: emailCost
      },
      research: request.include_research ? {
        cost_per_company: this.COST_PER_RESEARCH,
        companies: request.account_ids.length,
        total_cost: researchCost
      } : undefined,
      grand_total: grandTotal,
      current_balance: currentBalance,
      sufficient_credits: currentBalance >= grandTotal
    };
  }

  /**
   * Check if request requires approval based on cost
   */
  static requiresApproval(estimatedCost: number): boolean {
    return estimatedCost > this.APPROVAL_REQUIRED_THRESHOLD;
  }

  /**
   * Check if request should trigger cost warning
   */
  static shouldWarnUser(estimatedCost: number): boolean {
    return estimatedCost > this.COST_WARNING_THRESHOLD;
  }

  /**
   * Check rate limit for user
   */
  static checkRateLimit(userId: string): RateLimitInfo {
    const now = Date.now();
    const windowStart = now - this.RATE_LIMIT_WINDOW;

    // Get user's request history
    const userRequests = this.requestLog.get(userId) || [];

    // Remove old requests outside the window
    const recentRequests = userRequests.filter(timestamp => timestamp > windowStart);
    this.requestLog.set(userId, recentRequests);

    // Check daily usage
    const today = new Date().toISOString().split('T')[0];
    const dailyUsage = this.dailyUsage.get(userId);

    let dailyUsed = 0;
    if (dailyUsage && dailyUsage.date === today) {
      dailyUsed = dailyUsage.count;
    } else {
      // Reset daily counter for new day
      this.dailyUsage.set(userId, { date: today, count: 0 });
    }

    return {
      requests_remaining: Math.max(0, this.MAX_REQUESTS_PER_MINUTE - recentRequests.length),
      reset_time: new Date(now + (this.RATE_LIMIT_WINDOW - (now % this.RATE_LIMIT_WINDOW))),
      daily_limit: this.DAILY_LIMIT,
      daily_used: dailyUsed
    };
  }

  /**
   * Record a request for rate limiting
   */
  static recordRequest(userId: string): void {
    const now = Date.now();

    // Add to minute-based tracking
    const userRequests = this.requestLog.get(userId) || [];
    userRequests.push(now);
    this.requestLog.set(userId, userRequests);

    // Add to daily tracking
    const today = new Date().toISOString().split('T')[0];
    const dailyUsage = this.dailyUsage.get(userId) || { date: today, count: 0 };

    if (dailyUsage.date === today) {
      dailyUsage.count++;
    } else {
      dailyUsage.date = today;
      dailyUsage.count = 1;
    }

    this.dailyUsage.set(userId, dailyUsage);
  }

  /**
   * Check if user can make a request (rate limit + daily limit)
   */
  static canMakeRequest(userId: string): { allowed: boolean; reason?: string; resetTime?: Date } {
    const rateLimitInfo = this.checkRateLimit(userId);

    if (rateLimitInfo.requests_remaining <= 0) {
      return {
        allowed: false,
        reason: 'Rate limit exceeded (per minute)',
        resetTime: rateLimitInfo.reset_time
      };
    }

    if (rateLimitInfo.daily_used >= rateLimitInfo.daily_limit) {
      return {
        allowed: false,
        reason: 'Daily limit exceeded',
        resetTime: new Date(new Date().setHours(24, 0, 0, 0)) // Next midnight
      };
    }

    return { allowed: true };
  }

  /**
   * Validate generation request parameters
   */
  static validateRequest(request: GenerationRequest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!request.account_ids || request.account_ids.length === 0) {
      errors.push('At least one account ID is required');
    }

    if (request.account_ids && request.account_ids.length > 100) {
      errors.push('Maximum 100 accounts per request');
    }

    if (!request.email_sequences || request.email_sequences.length === 0) {
      errors.push('At least one email sequence is required');
    }

    if (request.email_sequences && request.email_sequences.some(seq => seq < 1 || seq > 4)) {
      errors.push('Email sequences must be between 1 and 4');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate mock response for development
   */
  static generateMockEmail(
    accountData: { company_name?: string; contact_name?: string; industry?: string; sign_in_count?: number; use_case?: string },
    templateData: { subject_template?: string; content_template?: string },
    sequence: number
  ): {
    subject: string;
    content: string;
    generation_time: number;
    estimated_cost: number;
  } {
    // Simulate realistic generation time
    const generationTime = Math.random() * 3 + 1; // 1-4 seconds

    const mockSubjects = [
      `Quick question about ${accountData.company_name}'s real-time infrastructure`,
      `How ${accountData.company_name} can scale messaging with Ably`,
      `Following up on ${accountData.company_name}'s real-time needs`,
      `Final thoughts on improving ${accountData.company_name}'s user experience`
    ];

    const mockContent = sequence === 1
      ? `Hi ${accountData.contact_name || 'there'},

I noticed ${accountData.company_name} has been exploring real-time messaging solutions, and I thought you might be interested in how we've helped similar ${accountData.industry || 'tech'} companies scale their applications.

Given that you've signed in ${accountData.sign_in_count} times and are using our platform for ${accountData.use_case || 'messaging'}, I'd love to share how our customers typically see a 3x improvement in their real-time features.

Would you be open to a brief 15-minute call next week?

Best regards,
Cameron Michie
Ably`
      : `Hi ${accountData.contact_name || 'there'},

Following up on my previous message about ${accountData.company_name}'s real-time infrastructure needs.

I noticed you haven't had a chance to respond yet, so I wanted to share a quick case study that might be relevant...

[This is email ${sequence} of 4 in the sequence]

Best regards,
Cameron Michie`;

    return {
      subject: mockSubjects[sequence - 1] || mockSubjects[0],
      content: mockContent,
      generation_time: generationTime,
      estimated_cost: this.COST_PER_EMAIL
    };
  }

  /**
   * Generate mock company research for development
   */
  static generateMockResearch(companyName: string, domain?: string): {
    company_overview: string;
    tech_stack: string[];
    recent_news: string[];
    pain_points: string[];
    sources: string[];
    generation_time: number;
    estimated_cost: number;
  } {
    const generationTime = Math.random() * 5 + 3; // 3-8 seconds for research

    return {
      company_overview: `${companyName} is a growing technology company focused on delivering innovative solutions to their customers. Based on our research, they appear to be scaling their technical infrastructure and exploring new technologies.`,
      tech_stack: ['React', 'Node.js', 'AWS', 'PostgreSQL', 'Redis'],
      recent_news: [
        'Recently expanded their engineering team',
        'Launched new product features',
        'Raised Series B funding'
      ],
      pain_points: [
        'Scaling real-time features',
        'Managing increased user load',
        'Improving development velocity'
      ],
      sources: ['website', 'crunchbase', 'linkedin', 'github'],
      generation_time: generationTime,
      estimated_cost: this.COST_PER_RESEARCH
    };
  }

  /**
   * Check if system is in mock mode
   */
  static isMockMode(): boolean {
    return env.claude.useMock === 'true';
  }

  /**
   * Get system configuration for debugging
   */
  static getConfiguration() {
    return {
      mock_mode: this.isMockMode(),
      cost_warning_threshold: this.COST_WARNING_THRESHOLD,
      approval_required_threshold: this.APPROVAL_REQUIRED_THRESHOLD,
      rate_limit_per_minute: this.MAX_REQUESTS_PER_MINUTE,
      daily_limit: this.DAILY_LIMIT,
      mock_balance: parseFloat(env.claude.mockBalance || '12.45')
    };
  }
}