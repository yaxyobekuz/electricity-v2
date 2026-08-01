"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

/**
 * TP ro'yxati filtri — fider bo'yicha tanlash va matn qidiruvi.
 * Ikkalasi ham URL'ga yoziladi, shunda filtrlangan ro'yxatni ulashish mumkin.
 */
export function TpFilters({
  feeders,
  feeder,
  query,
}: {
  feeders: { id: string; name: string }[];
  feeder: string;
  query: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (!value || value === "all") params.delete(key);
    else params.set(key, value);

    router.push(`?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form
        action={(formData) => update("q", String(formData.get("q") ?? "").trim())}
        className="relative"
      >
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-zinc-400" />
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="TP, hisoblagich, manzil..."
          aria-label="TP qidirish"
          className="h-8 w-52 rounded-lg border border-zinc-200 bg-white pr-2.5 pl-8 text-sm outline-none placeholder:text-zinc-400 focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-600"
        />
      </form>

      <label className="flex items-center gap-1.5">
        <span className="text-xs text-zinc-500">Fider</span>
        <select
          value={feeder}
          onChange={(event) => update("feeder", event.target.value)}
          className="h-8 rounded-lg border border-zinc-200 bg-white px-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-600"
        >
          <option value="all">Barchasi</option>
          {feeders.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
