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
  period: { start: string; end: string };
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

  const modelBreakdown: Record<
    string,
    { cost: number; tokens: number; messages: number }
  > = {};
  for (const entry of data.aggregates?.byModel || []) {
    const key = entry.model || "unknown";
    modelBreakdown[key] = {
      cost: entry.totals.totalCost || 0,
      tokens: entry.totals.totalTokens || 0,
      messages: entry.messageCount || 0,
    };
  }

  return {
    days: daysList,
    totalCost: data.totals?.totalCost || 0,
    totalTokens: data.totals?.totalTokens || 0,
    totalMessages: data.aggregates?.messages?.total || 0,
    byModel: modelBreakdown,
    period: {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
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
  };
}
