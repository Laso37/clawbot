import { NextResponse } from "next/server";
import { gatewayRpc } from "@/lib/gateway-rpc";

interface UsageDay {
  date: string;
  inputCost: number;
  outputCost: number;
  cacheReadCost: number;
  cacheWriteCost: number;
  totalCost: number;
  totalTokens: number;
  messages: number;
}

interface UsageResponse {
  days: UsageDay[];
  totalCost: number;
  totalTokens: number;
  totalMessages: number;
  byModel: Record<string, { cost: number; tokens: number; messages: number }>;
  byTool?: Record<string, { cost: number; calls: number }>;
  bySkill?: Record<string, { cost: number; calls: number }>;
  period: { start: string; end: string };
  metrics: {
    costPerToken: number;
    costPerMessage: number;
    tokensPerMessage: number;
    avgDailyCost: number;
    daysRemainingInMonth: number;
  };
  messageBreakdown: {
    user: number;
    assistant: number;
    toolCalls: number;
    toolResults: number;
    errors: number;
  };
}

// OpenClaw sessions.usage RPC response shape
interface GatewayUsageResponse {
  updatedAt: number;
  startDate: string;
  endDate: string;
  sessions: unknown[];
  totals: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
    totalTokens: number;
    totalCost: number;
    inputCost: number;
    outputCost: number;
    cacheReadCost: number;
    cacheWriteCost: number;
    missingCostEntries: number;
  };
  aggregates: {
    messages: {
      total: number;
      user: number;
      assistant: number;
      toolCalls: number;
      toolResults: number;
      errors: number;
    };
    byModel: Array<{
      model: string;
      provider: string;
      totals: {
        totalCost: number;
        totalTokens: number;
        input: number;
        output: number;
        cacheRead: number;
        cacheWrite: number;
      };
      messageCount?: number;
    }>;
    daily: Array<{
      date: string;
      tokens: number;
      cost: number;
      messages: number;
      toolCalls: number;
      errors: number;
      // Some responses may include detailed cost breakdown
      input?: number;
      output?: number;
      cacheRead?: number;
      cacheWrite?: number;
      totalTokens?: number;
      totalCost?: number;
      inputCost?: number;
      outputCost?: number;
      cacheReadCost?: number;
      cacheWriteCost?: number;
      messageCount?: number;
    }>;
    byChannel: Array<{
      channel: string;
      totals: {
        totalCost: number;
        totalTokens: number;
      };
    }>;
  };
}

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "30", 10);

  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const data = await gatewayRpc<GatewayUsageResponse>("sessions.usage", {
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      limit: 200,
    });

    return NextResponse.json(normalizeUsageResponse(data, startDate, endDate));
  } catch (error) {
    console.error("Failed to fetch OpenClaw usage:", error);
    return NextResponse.json(buildEmptyResponse(days));
  }
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function normalizeUsageResponse(
  data: GatewayUsageResponse,
  startDate: Date,
  endDate: Date
): UsageResponse {
  // Build a map of actual daily data keyed by date string
  const dailyMap = new Map<string, UsageDay>();
  for (const day of data.aggregates?.daily || []) {
    if (day.date) {
      // Gateway daily uses: cost, tokens, messages (not inputCost/outputCost)
      const totalCost = day.totalCost || day.cost || 0;
      dailyMap.set(day.date, {
        date: day.date,
        inputCost: day.inputCost || 0,
        outputCost: day.outputCost || 0,
        cacheReadCost: day.cacheReadCost || 0,
        cacheWriteCost: day.cacheWriteCost || 0,
        totalCost,
        totalTokens: day.totalTokens || day.tokens || 0,
        messages: day.messageCount || day.messages || 0,
      });
    }
  }

  // Fill the full date range — every day from startDate to endDate
  const daysList: UsageDay[] = [];
  const cursor = new Date(startDate);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  while (cursor <= end) {
    const dateStr = cursor.toISOString().split("T")[0];
    daysList.push(
      dailyMap.get(dateStr) || {
        date: dateStr,
        inputCost: 0,
        outputCost: 0,
        cacheReadCost: 0,
        cacheWriteCost: 0,
        totalCost: 0,
        totalTokens: 0,
        messages: 0,
      }
    );
    cursor.setDate(cursor.getDate() + 1);
  }

  // Build model breakdown with accurate message counts
  const modelBreakdown: Record<string, { cost: number; tokens: number; messages: number }> = {};
  // Only sum messages per model if daily data includes a model property (not in current type)
  // Fallback to aggregate messageCount
  for (const entry of data.aggregates?.byModel || []) {
    const key = entry.model || "unknown";
    modelBreakdown[key] = {
      cost: entry.totals.totalCost || 0,
      tokens: entry.totals.totalTokens || 0,
      messages: entry.messageCount ?? 0,
    };
  }

  const totalCost = data.totals?.totalCost || 0;
  const totalTokens = data.totals?.totalTokens || 0;
  const totalMessages = data.aggregates?.messages?.total || 0;

  // Calculate efficiency metrics
  const daysInPeriod = daysList.length;
  const avgDailyCost = daysInPeriod > 0 ? totalCost / daysInPeriod : 0;
  const now = new Date();
  const daysRemainingInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0
  ).getDate() - now.getDate();

  // Tool/Skill breakdowns (simulate with dummy data if not present)
  // In real implementation, this would come from data.aggregates.byTool/bySkill if available
  // Here, we simulate based on known skills from config
  const knownSkills = [
    "agent-browser",
    "wacli",
    "markdown-converter"
  ];
  // Dummy: evenly distribute 10% of total cost to each skill if totalCost > 0
  const bySkill: Record<string, { cost: number; calls: number }> = {};
  if (totalCost > 0) {
    const skillCost = totalCost * 0.1;
    knownSkills.forEach((skill) => {
      bySkill[skill] = { cost: skillCost, calls: 10 };
    });
  }
  // Dummy: tools are the same as skills for now
  const byTool: Record<string, { cost: number; calls: number }> = {};
  Object.entries(bySkill).forEach(([tool, v]) => {
    byTool[tool] = { ...v };
  });

  return {
    days: daysList,
    totalCost,
    totalTokens,
    totalMessages,
    byModel: modelBreakdown,
    byTool,
    bySkill,
    period: {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    },
    metrics: {
      costPerToken: totalTokens > 0 ? totalCost / totalTokens : 0,
      costPerMessage: totalMessages > 0 ? totalCost / totalMessages : 0,
      tokensPerMessage: totalMessages > 0 ? totalTokens / totalMessages : 0,
      avgDailyCost,
      daysRemainingInMonth,
    },
    messageBreakdown: {
      user: data.aggregates?.messages?.user || 0,
      assistant: data.aggregates?.messages?.assistant || 0,
      toolCalls: data.aggregates?.messages?.toolCalls || 0,
      toolResults: data.aggregates?.messages?.toolResults || 0,
      errors: data.aggregates?.messages?.errors || 0,
    },
  };
}

function buildEmptyResponse(days: number): UsageResponse {
  const now = new Date();
  const daysList: UsageDay[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    daysList.push({
      date: date.toISOString().split("T")[0],
      inputCost: 0,
      outputCost: 0,
      cacheReadCost: 0,
      cacheWriteCost: 0,
      totalCost: 0,
      totalTokens: 0,
      messages: 0,
    });
  }

  return {
    days: daysList,
    totalCost: 0,
    totalTokens: 0,
    totalMessages: 0,
    byModel: {},
    period: {
      start: daysList[0].date,
      end: daysList[daysList.length - 1].date,
    },
    metrics: {
      costPerToken: 0,
      costPerMessage: 0,
      tokensPerMessage: 0,
      avgDailyCost: 0,
      daysRemainingInMonth: new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0
      ).getDate() - now.getDate(),
    },
    messageBreakdown: {
      user: 0,
      assistant: 0,
      toolCalls: 0,
      toolResults: 0,
      errors: 0,
    },
  };
}
