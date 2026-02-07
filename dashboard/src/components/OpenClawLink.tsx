/**
 * Server component that renders the OpenClaw WebUI link
 * with the gateway token passed as a URL query parameter.
 * The token is read from the server-side env var and never
 * exposed beyond the authenticated Authelia session.
 */
export default function OpenClawLink() {
  const token = process.env.OPENCLAW_GATEWAY_TOKEN || "";
  const href = token
    ? `/openclaw/?token=${encodeURIComponent(token)}`
    : "/openclaw/";

  return (
    <a
      href={href}
      className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)]"
    >
      Open WebUI →
    </a>
  );
}
