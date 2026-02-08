"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

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

interface UsageData {
  days: UsageDay[];
  totalCost: number;
  totalTokens: number;
  totalMessages: number;
  byModel: Record<string, { cost: number; tokens: number; messages: number }>;
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

const COLORS = {
  input: "#0ea5e9",
  output: "#8b5cf6",
  cacheRead: "#22c55e",
  cacheWrite: "#f59e0b",
};

export function UsageDashboard() {
  const [data, setData] = useState<UsageData | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/usage?days=${days}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [days]);

  const formatCost = (value: number) =>
    `$${value.toFixed(value < 0.01 ? 4 : 2)}`;

  const formatTokens = (value: number) => {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return value.toString();
  };

  return (
    <div className="space-y-6">
            {/* Efficiency Metrics */}
            {data && (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <MetricCard
                  label="Cost per Token"
                  value={`$${data.metrics.costPerToken.toFixed(6)}`}
                  subtext="Lower is better"
                />
                <MetricCard
                  label="Cost per Message"
                  value={`$${data.metrics.costPerMessage.toFixed(4)}`}
                  subtext="Session metric"
                />
                <MetricCard
                  label="Avg Tokens/Message"
                  value={formatTokens(data.metrics.tokensPerMessage)}
                  subtext="Chat efficiency"
                />
                <MetricCard
                  label="Daily Average"
                  value={formatCost(data.metrics.avgDailyCost)}
                  subtext={`${data.metrics.daysRemainingInMonth} days left in month`}
                />
              </div>
            )}

            {/* Message Type Breakdown */}
            {data && data.messageBreakdown && (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
                <h3 className="mb-4 text-sm font-medium text-[var(--muted)]">
                  Message Breakdown
                </h3>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                  <div>
                    <p className="text-xs text-[var(--muted)]">User Messages</p>
                    <p className="mt-1 text-lg font-semibold text-white">
                      {data.messageBreakdown.user.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--muted)]">Assistant Messages</p>
                    <p className="mt-1 text-lg font-semibold text-white">
                      {data.messageBreakdown.assistant.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--muted)]">Tool Calls</p>
                    <p className="mt-1 text-lg font-semibold text-white">
                      {data.messageBreakdown.toolCalls.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--muted)]">Tool Results</p>
                    <p className="mt-1 text-lg font-semibold text-white">
                      {data.messageBreakdown.toolResults.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--muted)]">Errors</p>
                    <p className="mt-1 text-lg font-semibold text-white">
                      {data.messageBreakdown.errors.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}
      {/* Total Cost + Period Selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">API Usage</h2>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-4xl font-bold text-white">
              {loading ? "..." : formatCost(data?.totalCost || 0)}
            </span>
            <span className="text-[var(--muted)]">
              total · {days}d period
            </span>
          </div>
          {data && (
            <p className="mt-1 text-sm text-[var(--muted)]">
              {formatTokens(data.totalTokens)} tokens ·{" "}
              {data.totalMessages.toLocaleString()} messages
            </p>
          )}
        </div>

        <div className="flex gap-2">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                days === d
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--card)] text-[var(--muted)] hover:bg-[var(--card-hover)] hover:text-white"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Cost Chart */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
        <h3 className="mb-4 text-sm font-medium text-[var(--muted)]">
          Daily Cost Breakdown
        </h3>
        <div className="h-72">
          {loading ? (
            <div className="flex h-full items-center justify-center text-[var(--muted)]">
              Loading...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data?.days || []}
                margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="date"
                  stroke="#64748b"
                  fontSize={11}
                  tickFormatter={(v) => {
                    const d = new Date(v);
                    return `${d.getMonth() + 1}/${d.getDate()}`;
                  }}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                    color: "#e2e8f0",
                    fontSize: "12px",
                  }}
                  formatter={(value: number, name: string) => [
                    formatCost(value),
                    name,
                  ]}
                  labelFormatter={(label) =>
                    new Date(label).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })
                  }
                />
                <Legend
                  wrapperStyle={{ fontSize: "12px", color: "#94a3b8" }}
                />
                <Bar
                  dataKey="totalCost"
                  name="Total Cost"
                  fill={COLORS.input}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Model Breakdown Table */}
      {data && Object.keys(data.byModel).length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
          <h3 className="mb-4 text-sm font-medium text-[var(--muted)]">
            Cost by Model
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-[var(--muted)]">
                  <th className="pb-2 font-medium">Model</th>
                  <th className="pb-2 text-right font-medium">Cost</th>
                  <th className="pb-2 text-right font-medium">Tokens</th>
                  <th className="pb-2 text-right font-medium">Messages</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data.byModel)
                  .sort(([, a], [, b]) => b.cost - a.cost)
                  .map(([model, stats]) => (
                    <tr
                      key={model}
                      className="border-b border-[var(--border)] last:border-0"
                    >
                      <td className="py-2 text-white">{model}</td>
                      <td className="py-2 text-right text-white">
                        {formatCost(stats.cost)}
                      </td>
                      <td className="py-2 text-right text-[var(--muted)]">
                        {formatTokens(stats.tokens)}
                      </td>
                      <td className="py-2 text-right text-[var(--muted)]">
                        {stats.messages.toLocaleString()}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tool Breakdown Table */}
      {data && data.byTool && Object.keys(data.byTool).length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 mt-6">
          <h3 className="mb-4 text-sm font-medium text-[var(--muted)]">
            Cost by Tool
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-[var(--muted)]">
                  <th className="pb-2 font-medium">Tool</th>
                  <th className="pb-2 text-right font-medium">Cost</th>
                  <th className="pb-2 text-right font-medium">Calls</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data.byTool)
                  .sort(([, a], [, b]) => b.cost - a.cost)
                  .map(([tool, stats]) => (
                    <tr
                      key={tool}
                      className="border-b border-[var(--border)] last:border-0"
                    >
                      <td className="py-2 text-white">{tool}</td>
                      <td className="py-2 text-right text-white">
                        {formatCost(stats.cost)}
                      </td>
                      <td className="py-2 text-right text-[var(--muted)]">
                        {stats.calls.toLocaleString()}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Skill Breakdown Table */}
      {data && data.bySkill && Object.keys(data.bySkill).length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 mt-6">
          <h3 className="mb-4 text-sm font-medium text-[var(--muted)]">
            Cost by Skill
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-[var(--muted)]">
                  <th className="pb-2 font-medium">Skill</th>
                  <th className="pb-2 text-right font-medium">Cost</th>
                  <th className="pb-2 text-right font-medium">Calls</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data.bySkill)
                  .sort(([, a], [, b]) => b.cost - a.cost)
                  .map(([skill, stats]) => (
                    <tr
                      key={skill}
                      className="border-b border-[var(--border)] last:border-0"
                    >
                      <td className="py-2 text-white">{skill}</td>
                      <td className="py-2 text-right text-white">
                        {formatCost(stats.cost)}
                      </td>
                      <td className="py-2 text-right text-[var(--muted)]">
                        {stats.calls.toLocaleString()}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Budget Status */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BudgetCard
          label="Daily Budget"
          spent={data?.days[data.days.length - 1]?.totalCost || 0}
          limit={5}
        />
        <BudgetCard label="Monthly Budget" spent={data?.totalCost || 0} limit={200} />
      </div>
    </div>
  );
}

function BudgetCard({
  label,
  spent,
  limit,
  avgDaily,
  projectedMonthly,
}: {
  label: string;
  spent: number;
  limit: number;
  avgDaily?: number;
  projectedMonthly?: number;
}) {
  const pct = Math.min((spent / limit) * 100, 100);
  const color =
    pct >= 90
      ? "bg-[var(--danger)]"
      : pct >= 75
        ? "bg-[var(--warning)]"
        : "bg-[var(--accent)]";

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--muted)]">{label}</p>
        <p className="text-sm text-[var(--muted)]">
          ${spent.toFixed(2)} / ${limit}
        </p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--background)]">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-[var(--muted)]">
        {pct.toFixed(1)}% used
        {pct >= 75 && pct < 90 && " ⚠️ Approaching limit"}
        {pct >= 90 && " 🚨 Near limit!"}
      </p>
      {avgDaily !== undefined && (
        <p className="mt-1 text-xs text-[var(--muted)]">
          Average: ${avgDaily.toFixed(2)}/day
        </p>
      )}
      {projectedMonthly !== undefined && (
        <p className="mt-1 text-xs text-[var(--muted)]">
          Projected: ${projectedMonthly.toFixed(2)}/month
        </p>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  subtext,
}: {
  label: string;
  value: string;
  subtext: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs text-[var(--muted)]">{subtext}</p>
    </div>
  );
}
