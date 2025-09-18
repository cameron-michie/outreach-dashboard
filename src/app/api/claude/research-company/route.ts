import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ClaudeCostManager } from '@/lib/claude-cost-manager';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { company_name, company_domain, research_depth = 'basic' } = body;

    // Validate required parameters
    if (!company_name) {
      return NextResponse.json(
        { error: 'Missing required parameter: company_name' },
        { status: 400 }
      );
    }

    console.log(`🔍 Researching company: ${company_name} (${company_domain || 'no domain'})`);

    // Check rate limits
    const rateLimitCheck = ClaudeCostManager.canMakeRequest(session.user.id);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: rateLimitCheck.reason,
          retry_after: rateLimitCheck.resetTime
        },
        { status: 429 }
      );
    }

    // Record the request
    ClaudeCostManager.recordRequest(session.user.id);

    // Check if Ably Core MCP is available (placeholder)
    const ablyCoreEnabled = process.env.ABLY_CORE_MCP_ENABLED === 'true';

    if (!ablyCoreEnabled) {
      console.log('📋 Using mock research data - Ably Core MCP not available');

      // Generate mock research data
      const mockResearch = ClaudeCostManager.generateMockResearch(company_name, company_domain);

      const response = {
        success: true,
        research: mockResearch,
        ably_mcp_enabled: false,
        note: 'Using placeholder data - Ably Core MCP integration pending',
        research_metadata: {
          company_name,
          company_domain,
          research_depth,
          user: session.user.email,
          timestamp: new Date().toISOString(),
          cost: mockResearch.estimated_cost,
          generation_time: mockResearch.generation_time,
          mock_mode: true
        }
      };

      console.log(`✅ Mock research completed for ${company_name}`);
      return NextResponse.json(response);
    }

    // TODO: Implement real Ably Core MCP integration
    try {
      console.log('🌐 Attempting Ably Core MCP research...');

      // Placeholder for Ably Core MCP call
      const mcpResult = await performAblyMCPResearch(company_name, company_domain, research_depth);

      const response = {
        success: true,
        research: mcpResult,
        ably_mcp_enabled: true,
        research_metadata: {
          company_name,
          company_domain,
          research_depth,
          user: session.user.email,
          timestamp: new Date().toISOString(),
          cost: mcpResult.estimated_cost,
          generation_time: mcpResult.generation_time,
          mock_mode: false
        }
      };

      console.log(`✅ Ably MCP research completed for ${company_name}`);
      return NextResponse.json(response);

    } catch (mcpError) {
      console.warn('⚠️ Ably Core MCP failed, falling back to mock data:', mcpError);

      // Fallback to mock data if MCP fails
      const mockResearch = ClaudeCostManager.generateMockResearch(company_name, company_domain);

      const response = {
        success: true,
        research: mockResearch,
        ably_mcp_enabled: true,
        mcp_error: mcpError instanceof Error ? mcpError.message : 'Unknown MCP error',
        fallback_used: true,
        note: 'Ably Core MCP failed, using fallback data',
        research_metadata: {
          company_name,
          company_domain,
          research_depth,
          user: session.user.email,
          timestamp: new Date().toISOString(),
          cost: mockResearch.estimated_cost,
          generation_time: mockResearch.generation_time,
          mock_mode: true
        }
      };

      return NextResponse.json(response);
    }

  } catch (error) {
    console.error('❌ Company research error:', error);
    return NextResponse.json(
      {
        error: 'Failed to research company',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ablyCoreEnabled = process.env.ABLY_CORE_MCP_ENABLED === 'true';
    const config = ClaudeCostManager.getConfiguration();
    const rateLimitInfo = ClaudeCostManager.checkRateLimit(session.user.id);

    return NextResponse.json({
      success: true,
      ably_mcp_status: {
        enabled: ablyCoreEnabled,
        available_features: ablyCoreEnabled ? [
          'company_overview',
          'tech_stack_analysis',
          'recent_news_tracking',
          'pain_point_identification',
          'contact_enrichment'
        ] : [],
        fallback_mode: !ablyCoreEnabled ? 'mock_data' : 'enabled'
      },
      cost_info: {
        research_cost_per_company: ClaudeCostManager['COST_PER_RESEARCH'],
        current_balance: parseFloat(config.mock_balance),
        rate_limit: rateLimitInfo
      },
      supported_research_depths: ['basic', 'detailed'],
      example_request: {
        company_name: 'Acme Corp',
        company_domain: 'acme.com',
        research_depth: 'basic'
      }
    });

  } catch (error) {
    console.error('❌ Research status error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get research status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Placeholder function for Ably Core MCP integration
async function performAblyMCPResearch(
  companyName: string,
  companyDomain?: string,
  researchDepth: string = 'basic'
): Promise<any> {
  // This is a placeholder for the actual Ably Core MCP integration
  // In the future, this would connect to the MCP server and perform real research

  throw new Error('Ably Core MCP integration not yet implemented');

  /*
  // Future implementation would look something like:

  const mcpClient = new AblyCoreMCPClient();

  const researchTasks = await Promise.all([
    mcpClient.getCompanyOverview(companyName, companyDomain),
    mcpClient.analyzeTechStack(companyDomain),
    mcpClient.getRecentNews(companyName),
    mcpClient.identifyPainPoints(companyName, researchDepth)
  ]);

  return {
    company_overview: researchTasks[0],
    tech_stack: researchTasks[1],
    recent_news: researchTasks[2],
    pain_points: researchTasks[3],
    sources: ['website', 'crunchbase', 'linkedin', 'github', 'news_api'],
    generation_time: performance.now() - startTime,
    estimated_cost: 0.15 // Real cost from MCP
  };
  */
}