import { ICPAccount } from './snowflake';

// Template variable substitution engine
export interface TemplateVariables {
  // Account data from Snowflake
  company_name?: string;
  contact_name?: string;
  contact_email?: string;
  use_case?: string;
  sign_in_count?: number;
  dt_sign_up?: string;
  dt_last_sign_in?: string;
  messages?: number;
  peak_connections?: number;
  icp_intent?: 'yes' | 'no';

  // Research data (from Ably MCP or other sources)
  tech_stack?: string[];
  recent_news?: string[];
  pain_points?: string[];
  industry?: string;
  company_size?: string;

  // Calculated/enriched data
  engagement_score?: number;
  days_since_signup?: number;
  feature_usage?: string;
  improvement_metric?: string;

  // Email metadata
  sender_name?: string;
  sender_email?: string;
  email_sequence?: number;
  total_emails?: number;
}

export interface TemplateContext {
  variables: TemplateVariables;
  account_data: ICPAccount;
  research_data?: any;
  user_data: {
    name: string;
    email: string;
  };
  sequence_number: number;
}

export class TemplateEngine {
  /**
   * Extract variables from account data
   */
  static extractAccountVariables(account: ICPAccount): TemplateVariables {
    const signupDate = account.dt_sign_up ? new Date(account.dt_sign_up) : null;
    const daysSinceSignup = signupDate
      ? Math.floor((Date.now() - signupDate.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return {
      company_name: account.company_name || 'your company',
      contact_name: account.first_name ? `${account.first_name} ${account.last_name || ''}`.trim() : 'there',
      contact_email: account.user_email,
      use_case: account.use_case || 'messaging',
      sign_in_count: account.sign_in_count || 0,
      dt_sign_up: account.dt_sign_up,
      dt_last_sign_in: account.dt_last_sign_in,
      messages: account.messages,
      peak_connections: account.peak_connections,
      icp_intent: account.icp_intent,
      days_since_signup: daysSinceSignup,
      feature_usage: this.determineFeatureUsage(account),
      improvement_metric: this.determineImprovementMetric(account),
    };
  }

  /**
   * Substitute variables in template text
   */
  static substituteVariables(template: string, variables: TemplateVariables): string {
    let result = template;

    // Replace all {{variable_name}} patterns
    const variablePattern = /\{\{([^}]+)\}\}/g;

    result = result.replace(variablePattern, (match, variableName) => {
      const trimmedName = variableName.trim();
      const value = variables[trimmedName as keyof TemplateVariables];

      if (value === undefined || value === null) {
        console.warn(`Template variable not found: ${trimmedName}`);
        return `[${trimmedName}]`; // Show missing variables clearly
      }

      // Handle arrays (like tech_stack)
      if (Array.isArray(value)) {
        return this.formatArray(value, trimmedName);
      }

      // Handle numbers
      if (typeof value === 'number') {
        return this.formatNumber(value, trimmedName);
      }

      return String(value);
    });

    return result;
  }

  /**
   * Create full template context from account and user data
   */
  static createTemplateContext(
    account: ICPAccount,
    userData: { name: string; email: string },
    sequenceNumber: number,
    researchData?: any
  ): TemplateContext {
    const accountVariables = this.extractAccountVariables(account);

    const variables: TemplateVariables = {
      ...accountVariables,
      sender_name: userData.name,
      sender_email: userData.email,
      email_sequence: sequenceNumber,
      total_emails: 4, // Standard 4-email sequence
    };

    // Add research data if available
    if (researchData) {
      variables.tech_stack = researchData.tech_stack;
      variables.recent_news = researchData.recent_news;
      variables.pain_points = researchData.pain_points;
      variables.industry = researchData.industry;
      variables.company_size = researchData.company_size;
    }

    return {
      variables,
      account_data: account,
      research_data: researchData,
      user_data: userData,
      sequence_number: sequenceNumber,
    };
  }

  /**
   * Generate email subject and content using template
   */
  static generateEmail(
    subjectTemplate: string,
    contentTemplate: string,
    context: TemplateContext
  ): { subject: string; content: string; variables_used: string[] } {
    const variablesUsed = new Set<string>();

    // Track which variables are actually used
    const trackingProxy = new Proxy(context.variables, {
      get(target, prop) {
        if (typeof prop === 'string') {
          variablesUsed.add(prop);
        }
        return target[prop as keyof TemplateVariables];
      }
    });

    // Create context with tracking
    const trackingContext = { ...context, variables: trackingProxy };

    const subject = this.substituteVariables(subjectTemplate, trackingContext.variables);
    const content = this.substituteVariables(contentTemplate, trackingContext.variables);

    return {
      subject,
      content,
      variables_used: Array.from(variablesUsed),
    };
  }

  /**
   * Validate template syntax
   */
  static validateTemplate(template: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const variablePattern = /\{\{([^}]+)\}\}/g;
    const unclosedPattern = /\{\{[^}]*$/;
    const invalidPattern = /\}\}[^{]*\{\{/;

    // Check for unclosed variables
    if (unclosedPattern.test(template)) {
      errors.push('Template contains unclosed variable declarations');
    }

    // Check for nested variables (not supported)
    const matches = template.match(variablePattern);
    if (matches) {
      for (const match of matches) {
        if (match.includes('{{')) {
          errors.push(`Nested variables are not supported: ${match}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get all variables used in a template
   */
  static extractVariableNames(template: string): string[] {
    const variablePattern = /\{\{([^}]+)\}\}/g;
    const variables = new Set<string>();
    let match;

    while ((match = variablePattern.exec(template)) !== null) {
      variables.add(match[1].trim());
    }

    return Array.from(variables);
  }

  /**
   * Preview template with sample data
   */
  static previewTemplate(
    subjectTemplate: string,
    contentTemplate: string,
    sampleData?: Partial<TemplateVariables>
  ): { subject: string; content: string; variables_used: string[] } {
    const defaultSampleData: TemplateVariables = {
      company_name: 'Acme Corp',
      contact_name: 'John Smith',
      contact_email: 'john@acme.com',
      use_case: 'real-time messaging',
      sign_in_count: 15,
      dt_sign_up: '2024-01-15',
      messages: 1250,
      peak_connections: 45,
      icp_intent: 'yes',
      sender_name: 'Cameron Michie',
      sender_email: 'cameron.michie@ably.com',
      email_sequence: 1,
      total_emails: 4,
      tech_stack: ['React', 'Node.js', 'AWS'],
      recent_news: ['Series B funding', 'New CTO hire'],
      pain_points: ['Scaling real-time features', 'Performance optimization'],
      engagement_score: 85,
      days_since_signup: 45,
      improvement_metric: '3x performance',
    };

    const variables = { ...defaultSampleData, ...sampleData };
    const variablesUsed: string[] = [];

    // Track used variables
    const subject = this.substituteVariables(subjectTemplate, variables);
    const content = this.substituteVariables(contentTemplate, variables);

    // Extract actually used variables
    const subjectVars = this.extractVariableNames(subjectTemplate);
    const contentVars = this.extractVariableNames(contentTemplate);
    variablesUsed.push(...subjectVars, ...contentVars);

    return {
      subject,
      content,
      variables_used: [...new Set(variablesUsed)],
    };
  }

  // Helper methods

  private static determineFeatureUsage(account: ICPAccount): string {
    if (account.messages && account.messages > 1000) {
      return 'high message volume';
    }
    if (account.peak_connections && account.peak_connections > 50) {
      return 'high concurrent connections';
    }
    if (account.sign_in_count > 10) {
      return 'regular platform usage';
    }
    return 'exploring our platform';
  }

  private static determineImprovementMetric(account: ICPAccount): string {
    if (account.icp_intent === 'yes') {
      return '3x performance improvement';
    }
    if (account.sign_in_count > 5) {
      return '50% reduction in latency';
    }
    return '2x faster development';
  }

  private static formatArray(value: any[], variableName: string): string {
    if (variableName === 'tech_stack') {
      return value.join(', ');
    }
    if (variableName === 'recent_news' || variableName === 'pain_points') {
      return value.slice(0, 2).join(' and '); // Show only first 2 items
    }
    return value.join(', ');
  }

  private static formatNumber(value: number, variableName: string): string {
    if (variableName === 'sign_in_count') {
      return value.toString();
    }
    if (variableName === 'messages' || variableName === 'peak_connections') {
      return value.toLocaleString(); // Add commas for large numbers
    }
    if (variableName === 'engagement_score') {
      return `${value}%`;
    }
    return value.toString();
  }
}