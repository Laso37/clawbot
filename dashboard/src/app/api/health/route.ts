import { NextResponse } from "next/server";
import { gatewayRpc } from "@/lib/gateway-rpc";

export const dynamic = "force-dynamic";

interface HealthResponse {
  uptimeMs?: number;
  presence?: Record<string, unknown>;
  stateVersion?: Record<string, number>;
  sessionDefaults?: {
    defaultAgentId?: string;
  };
}

export async function GET() {
  try {
    // Use the "sessions.usage" RPC with a 1-day window as a health probe
    // — if it responds, the gateway is alive. We also get uptime from
    // a lightweight "channels.status" call.
    const data = await gatewayRpc<HealthResponse>("channels.status", {}, 8000);

    return NextResponse.json({
      openclaw: "online",
      uptimeMs: data?.uptimeMs ?? null,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("connect")) {
      return NextResponse.json({ openclaw: "offline" });
    }
    return NextResponse.json({ openclaw: "degraded" });
  }
}
