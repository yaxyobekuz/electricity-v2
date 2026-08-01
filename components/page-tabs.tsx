"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { LayoutDashboard, Settings, Table2 } from "lucide-react";

/**
 * Sahifa ichidagi tablar. Tanlov URL'ga (`?tab=...`) yoziladi —
 * havolani ulashganda ham o'sha tab ochiladi va "orqaga" tugmasi ishlaydi.
 * Shu sabab `<button>` emas, `<Link>`.
 *
 * Ikonka KOMPONENT sifatida emas, NOM sifatida uzatiladi: lucide ikonkasi —
 * funksiya, funksiyalarni esa Server Component'dan Client Component'ga
 * prop qilib berib bo'lmaydi.
 */
const ICONS = {
  dashboard: LayoutDashboard,
  table: Table2,
  settings: Settings,
};

export type TabIcon = keyof typeof ICONS;

export function PageTabs({
  tabs,
  current,
  param = "tab",
}: {
  tabs: { id: string; label: string; icon?: TabIcon }[];
  current: string;
  param?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function hrefFor(id: string) {
    const params = new URLSearchParams(searchParams.toString());

    // Birinchi tab — sukut bo'yicha, URL'ni ortiqcha parametr bilan
    // to'ldirmaymiz.
    if (id === tabs[0].id) params.delete(param);
    else params.set(param, id);

    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  return (
    <nav
      aria-label="Bo'lim tanlash"
      className="-mb-px flex gap-1 overflow-x-auto border-b border-zinc-200 dark:border-zinc-800"
    >
      {tabs.map((tab) => {
        const isActive = current === tab.id;
        const Icon = tab.icon ? ICONS[tab.icon] : null;

        return (
          <Link
            key={tab.id}
            href={hrefFor(tab.id)}
            aria-current={isActive ? "page" : undefined}
            className={`inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm whitespace-nowrap transition-colors ${
              isActive
                ? "border-zinc-900 font-semibold text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
                : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            {Icon && <Icon className="size-4" />}
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
