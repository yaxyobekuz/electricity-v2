"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

/**
 * Yuqori paneldagi tablar: Umumiy | Fider 1 | Fider 2 | ...
 *
 * Tanlov URL'ga (`?feeder=<id>`) yoziladi — havolani ulashganda ham
 * o'sha fider ochiladi va brauzer "orqaga" tugmasi to'g'ri ishlaydi.
 * Shu sabab `<button>` emas, `<Link>` ishlatilgan.
 */
export function FeederTabs({
  feeders,
  current,
}: {
  feeders: { id: string; name: string }[];
  current: string | null;
}) {
  const searchParams = useSearchParams();

  function hrefFor(feederId: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (feederId) params.set("feeder", feederId);
    else params.delete("feeder");

    const query = params.toString();
    return query ? `/?${query}` : "/";
  }

  const tabs = [{ id: null, name: "Umumiy" }, ...feeders.map((f) => ({ id: f.id, name: f.name }))];

  return (
    <nav
      aria-label="Fider tanlash"
      className="-mb-px flex gap-1 overflow-x-auto"
    >
      {tabs.map((tab) => {
        const isActive = current === tab.id;

        return (
          <Link
            key={tab.id ?? "all"}
            href={hrefFor(tab.id)}
            aria-current={isActive ? "page" : undefined}
            className={`shrink-0 border-b-2 px-2.5 py-2 text-sm whitespace-nowrap transition-colors ${
              isActive
                ? "border-zinc-900 font-semibold text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
                : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            {tab.name}
          </Link>
        );
      })}
    </nav>
  );
}
