import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";

interface OpenClawConfig {
  agents?: {
    defaults?: {
      heartbeat?: {
        model?: string;
      };
    };
  };
}

export async function GET() {
  try {
    // Read openclaw.json from the mounted config volume
    const configPath = join(
      process.env.OPENCLAW_CONFIG_PATH || "/home/node/.openclaw",
      "openclaw.json"
    );

    const content = readFileSync(configPath, "utf-8");
    const config: OpenClawConfig = JSON.parse(content);

    // Extract heartbeat model
    const heartbeatModel = config.agents?.defaults?.heartbeat?.model || "unknown";

    // Parse model name and provider
    const { modelId, provider } = parseModel(heartbeatModel);

    return NextResponse.json({
      heartbeatModel,
      heartbeatModelName: modelId,
      heartbeatProvider: provider,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Failed to read openclaw config:", msg);

    return NextResponse.json(
      {
        heartbeatModel: "unknown",
        heartbeatModelName: "Unknown",
        heartbeatProvider: "Unknown",
        error: msg,
      },
      { status: 500 }
    );
  }
}

function parseModel(model: string): { modelId: string; provider: string } {
  if (!model || model === "unknown") {
    return { modelId: "Unknown", provider: "Unknown" };
  }

  // Format: "provider/modelId:version" → extract both parts
  // "ollama/tinyllama:1.1b" → { modelId: "tinyllama:1.1b", provider: "Ollama" }
  const [provider, rest] = model.split("/");

  // Capitalize provider name
  const capitalizedProvider =
    provider.charAt(0).toUpperCase() + provider.slice(1);

  return {
    modelId: rest || model,
    provider: capitalizedProvider,
  };
}
