import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ClaudeCostManager } from '@/lib/claude-cost-manager';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const accounts = parseInt(searchParams.get('accounts') || '1');
    const sequences = parseInt(searchParams.get('sequences') || '1');
    const includeResearch = searchParams.get('research') === 'true';

    // Validate parameters
    if (accounts < 1 || accounts > 100) {
      return NextResponse.json(
        { error: 'Accounts must be between 1 and 100' },
        { status: 400 }
      );
    }

    if (sequences < 1 || sequences > 4) {
      return NextResponse.json(
        { error: 'Sequences must be between 1 and 4' },
        { status: 400 }
      );
    }

    console.log(`💰 Estimating costs for ${accounts} accounts, ${sequences} sequences, research: ${includeResearch}`);

    // Generate cost estimate
    const costEstimate = ClaudeCostManager.estimateCosts({
      account_ids: Array(accounts).fill('dummy'), // Just for counting
      email_sequences: Array(sequences).fill(1), // Just for counting
      include_research: includeResearch
    });

    // Get rate limit information
    const rateLimitInfo = ClaudeCostManager.checkRateLimit(session.user.id);

    // Get configuration
    const config = ClaudeCostManager.getConfiguration();

    // Calculate warnings and recommendations
    const warnings: string[] = [];
    const recommendations: string[] = [];

    if (!costEstimate.sufficient_credits) {
      warnings.push(`Insufficient credits: Need $${costEstimate.grand_total}, have $${costEstimate.current_balance}`);
      recommendations.push('Add more credits to your Claude account or reduce the scope');
    }

    if (ClaudeCostManager.requiresApproval(costEstimate.grand_total)) {
      warnings.push(`Cost of $${costEstimate.grand_total} requires admin approval`);
      recommendations.push('Consider breaking this into smaller batches or get admin approval');
    }

    if (ClaudeCostManager.shouldWarnUser(costEstimate.grand_total)) {
      warnings.push(`High cost operation: $${costEstimate.grand_total}`);
      recommendations.push('Consider using mock mode for testing or reducing scope');
    }

    if (rateLimitInfo.requests_remaining < 5) {
      warnings.push(`Low rate limit remaining: ${rateLimitInfo.requests_remaining} requests`);
      recommendations.push(`Wait until ${rateLimitInfo.reset_time.toISOString()} or reduce request frequency`);
    }

    if (rateLimitInfo.daily_used > rateLimitInfo.daily_limit * 0.8) {
      warnings.push(`High daily usage: ${rateLimitInfo.daily_used}/${rateLimitInfo.daily_limit} requests`);
      recommendations.push('Consider spreading requests across multiple days');
    }

    // Calculate time estimates
    const estimatedTimeSeconds = includeResearch
      ? (accounts * 8) + (accounts * sequences * 3) // 8s research + 3s per email
      : (accounts * sequences * 3); // 3s per email

    const estimatedTimeMinutes = Math.ceil(estimatedTimeSeconds / 60);

    const response = {
      success: true,
      estimates: costEstimate,
      timing: {
        estimated_seconds: estimatedTimeSeconds,
        estimated_minutes: estimatedTimeMinutes,
        estimated_human_readable: estimatedTimeMinutes > 60
          ? `${Math.floor(estimatedTimeMinutes / 60)}h ${estimatedTimeMinutes % 60}m`
          : `${estimatedTimeMinutes}m`
      },
      rate_limit: rateLimitInfo,
      configuration: {
        mock_mode: config.mock_mode,
        cost_warning_threshold: config.cost_warning_threshold,
        approval_required_threshold: config.approval_required_threshold
      },
      analysis: {
        warnings,
        recommendations,
        can_proceed: costEstimate.sufficient_credits && rateLimitInfo.requests_remaining > 0,
        requires_approval: ClaudeCostManager.requiresApproval(costEstimate.grand_total),
        high_cost_warning: ClaudeCostManager.shouldWarnUser(costEstimate.grand_total)
      },
      breakdown: {
        total_operations: accounts * sequences + (includeResearch ? accounts : 0),
        email_generations: accounts * sequences,
        research_operations: includeResearch ? accounts : 0,
        cost_per_email: costEstimate.email_generation.cost_per_email,
        cost_per_research: costEstimate.research?.cost_per_company || 0
      },
      suggestions: {
        optimal_batch_size: config.mock_mode ? 50 : 20,
        recommended_sequences: sequences > 2 ? 'Consider starting with 1-2 sequences' : undefined,
        mock_mode_suggestion: !config.mock_mode && costEstimate.grand_total > 1
          ? 'Consider using mock mode for testing (set use_mock: true)'
          : undefined
      }
    };

    console.log(`✅ Cost estimate generated: $${costEstimate.grand_total} for ${accounts * sequences} emails`);

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Cost estimation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to estimate costs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { account_ids, email_sequences, include_research } = body;

    // Validate the actual request parameters
    const validation = ClaudeCostManager.validateRequest({
      account_ids: account_ids || [],
      email_sequences: email_sequences || [],
      include_research
    });

    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: validation.errors },
        { status: 400 }
      );
    }

    console.log(`💰 Detailed cost estimation for specific request`);

    // Generate detailed cost estimate
    const costEstimate = ClaudeCostManager.estimateCosts({
      account_ids,
      email_sequences,
      include_research
    });

    // Get additional context
    const rateLimitInfo = ClaudeCostManager.checkRateLimit(session.user.id);
    const config = ClaudeCostManager.getConfiguration();

    // Create detailed breakdown by account and sequence
    const detailedBreakdown = account_ids.map((accountId: string) => ({
      account_id: accountId,
      sequences: email_sequences.map((seq: number) => ({
        sequence: seq,
        email_cost: costEstimate.email_generation.cost_per_email,
        research_cost: include_research ? (costEstimate.research?.cost_per_company || 0) / email_sequences.length : 0
      })),
      total_cost_per_account: costEstimate.email_generation.cost_per_email * email_sequences.length +
        (include_research ? (costEstimate.research?.cost_per_company || 0) : 0)
    }));

    const response = {
      success: true,
      request_details: {
        accounts: account_ids.length,
        sequences: email_sequences.length,
        include_research,
        total_emails: account_ids.length * email_sequences.length
      },
      estimates: costEstimate,
      detailed_breakdown: detailedBreakdown,
      rate_limit: rateLimitInfo,
      authorization: {
        can_proceed: costEstimate.sufficient_credits && rateLimitInfo.requests_remaining > 0,
        requires_approval: ClaudeCostManager.requiresApproval(costEstimate.grand_total),
        approval_threshold: config.approval_required_threshold,
        current_user_role: session.user.role
      },
      timing_estimate: {
        per_email_seconds: config.mock_mode ? 2 : 5,
        per_research_seconds: config.mock_mode ? 5 : 10,
        total_estimated_seconds: account_ids.length * email_sequences.length * (config.mock_mode ? 2 : 5) +
          (include_research ? account_ids.length * (config.mock_mode ? 5 : 10) : 0)
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Detailed cost estimation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to estimate costs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}