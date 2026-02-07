import WebSocket from "ws";
import { randomUUID } from "crypto";

const GATEWAY_URL =
  process.env.OPENCLAW_GATEWAY_URL || "ws://openclaw-gateway:18789";
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || "";

interface RpcResponse {
  type: "res";
  id: string;
  ok: boolean;
  payload?: unknown;
  data?: unknown;
  error?: { code: number; message: string };
}

/**
 * Open a WebSocket to the OpenClaw gateway, perform the connect handshake,
 * call a single RPC method, then close. Returns the response data.
 */
export async function gatewayRpc<T = unknown>(
  method: string,
  params: Record<string, unknown> = {},
  timeoutMs = 15_000
): Promise<T> {
  const wsUrl = GATEWAY_URL.replace(/^http/, "ws");

  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      try { ws.close(); } catch {}
      reject(new Error(`gateway RPC timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    const ws = new WebSocket(wsUrl);

    ws.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    let connected = false;

    ws.on("open", () => {
      // Step 1: send connect handshake
      const connectId = randomUUID();
      ws.send(
        JSON.stringify({
          type: "req",
          id: connectId,
          method: "connect",
          params: {
            minProtocol: 3,
            maxProtocol: 3,
            client: {
              id: "gateway-client",
              displayName: "ClawBot Dashboard",
              version: "1.0.0",
              platform: "linux",
              mode: "backend",
            },
            caps: [],
            role: "operator",
            auth: { token: GATEWAY_TOKEN },
          },
        })
      );
    });

    ws.on("message", (raw) => {
      let msg: RpcResponse;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }

      if (msg.type !== "res") return;

      if (!connected) {
        // This is the connect response
        if (!msg.ok) {
          clearTimeout(timer);
          ws.close();
          reject(
            new Error(
              `gateway connect failed: ${msg.error?.message || "unknown"}`
            )
          );
          return;
        }
        connected = true;

        // Step 2: send the actual RPC request
        const rpcId = randomUUID();
        ws.send(
          JSON.stringify({
            type: "req",
            id: rpcId,
            method,
            params,
          })
        );
        return;
      }

      // This is the RPC response
      clearTimeout(timer);
      ws.close();

      if (!msg.ok) {
        reject(
          new Error(
            `gateway RPC ${method} failed: ${msg.error?.message || "unknown"}`
          )
        );
        return;
      }

      resolve((msg.payload ?? msg.data) as T);
    });

    ws.on("close", () => {
      clearTimeout(timer);
    });
  });
}
