"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

/** Fider ro'yxati filtri — ввод bo'yicha tanlash va nom bo'yicha qidiruv. */
export function FeederFilters({
  transformers,
  transformer,
  query,
}: {
  transformers: { id: string; name: string }[];
  transformer: string;
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
          placeholder="Fider nomi..."
          aria-label="Fider qidirish"
          className="h-8 w-44 rounded-lg border border-zinc-200 bg-white pr-2.5 pl-8 text-sm outline-none placeholder:text-zinc-400 focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-600"
        />
      </form>

      <label className="flex items-center gap-1.5">
        <span className="text-xs text-zinc-500">Ввод</span>
        <select
          value={transformer}
          onChange={(event) => update("transformer", event.target.value)}
          className="h-8 rounded-lg border border-zinc-200 bg-white px-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-600"
        >
          <option value="all">Barchasi</option>
          {transformers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
