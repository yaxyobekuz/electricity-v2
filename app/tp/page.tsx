import { getAvailablePeriods } from "@/lib/reports";
import { formatPeriod } from "@/lib/format";
import { PageTabs } from "@/components/page-tabs";
import type { TabIcon } from "@/components/page-tabs";
import { PageHeading } from "@/components/ui";
import { TpDashboardView } from "./dashboard-view";
import { TpListView } from "./list-view";

export const dynamic = "force-dynamic";

export const metadata = { title: "TP'lar — Electricity" };

const TABS: { id: string; label: string; icon: TabIcon }[] = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard" },
  { id: "list", label: "Ro'yxat va sozlamalar", icon: "settings" },
];

export default async function TpPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; feeder?: string; q?: string }>;
}) {
  const params = await searchParams;
  const tab = params.tab === "list" ? "list" : "dashboard";

  const periods = await getAvailablePeriods();
  const period = periods[0] ?? null;

  return (
    <div className="flex flex-col gap-3">
      <PageHeading
        title="TP'lar"
        description={
          period
            ? `Transformator punktlari · ${formatPeriod(period)}`
            : "Transformator punktlari"
        }
      />

      <PageTabs tabs={TABS} current={tab} />

      {tab === "dashboard" ? (
        <TpDashboardView period={period} />
      ) : (
        <TpListView searchParams={params} />
      )}
    </div>
  );
}
