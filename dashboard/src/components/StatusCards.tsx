"use client";

import { useEffect, useState } from "react";

interface HealthData {
  openclaw: "online" | "offline" | "degraded";
  version?: string;
}

interface ConfigData {
  heartbeatModel: string;
  heartbeatModelName: string;
  heartbeatProvider: string;
}

export function StatusCards({ openClawUrl }: { openClawUrl: string }) {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [config, setConfig] = useState<ConfigData | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth({ openclaw: "offline" }));

    fetch("/api/config")
      .then((r) => r.json())
      .then(setConfig)
      .catch(() =>
        setConfig({
          heartbeatModel: "unknown",
          heartbeatModelName: "Unknown",
          heartbeatProvider: "Unknown",
        })
      );
  }, []);

  const statusColor = {
    online: "bg-green-500",
    offline: "bg-red-500",
    degraded: "bg-yellow-500",
  };

  const statusText = {
    online: "Online",
    offline: "Offline",
    degraded: "Degraded",
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Gateway Status */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-[var(--muted)]">Gateway Status</p>
          <span
            className={`inline-block h-3 w-3 rounded-full ${
              health ? statusColor[health.openclaw] : "bg-gray-500 animate-pulse"
            }`}
          />
        </div>
        <p className="mt-2 text-2xl font-bold text-white">
          {health ? statusText[health.openclaw] : "Checking..."}
        </p>
        {health?.version && (
          <p className="mt-1 text-xs text-[var(--muted)]">v{health.version}</p>
        )}
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
        <p className="text-sm text-[var(--muted)]">OpenClaw WebUI</p>
        <a
          href={openClawUrl}
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)]"
        >
          <span>🦞</span>
          Launch WebUI
        </a>
      </div>

      {/* Model Info */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
        <p className="text-sm text-[var(--muted)]">Default Model</p>
        <p className="mt-2 text-lg font-semibold text-white">Haiku 4.5</p>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Sonnet available on demand
        </p>
      </div>

      {/* Heartbeat */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
        <p className="text-sm text-[var(--muted)]">Heartbeat</p>
        <p className="mt-2 text-lg font-semibold text-white">
          {config ? config.heartbeatProvider : "Loading..."} Local
        </p>
        <p className="mt-1 text-xs text-[var(--muted)]">
          {config ? config.heartbeatModelName : "Loading..."}
        </p>
      </div>
    </div>
  );
}
