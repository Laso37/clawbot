import { UsageDashboard } from "@/components/UsageDashboard";
import { StatusCards } from "@/components/StatusCards";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const token = process.env.OPENCLAW_GATEWAY_TOKEN || "";
  const openClawUrl = token
    ? `/openclaw/?token=${encodeURIComponent(token)}`
    : "/openclaw/";

  return (
    <div className="space-y-6">
      {/* Status overview cards */}
      <StatusCards openClawUrl={openClawUrl} />

      {/* Usage chart + cost breakdown */}
      <UsageDashboard />
    </div>
  );
}
