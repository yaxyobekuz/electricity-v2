"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { formatPeriod } from "@/lib/format";

/**
 * Hisobot davrini tanlash. Tanlov URL'ga (`?period=2026-08`) yoziladi —
 * shunda sahifa havolasi ulashilganda ham o'sha davr ochiladi.
 */
export function PeriodSelect({
  periods,
  current,
}: {
  periods: string[];
  current: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function onChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", value);
    router.push(`?${params.toString()}`);
  }

  if (periods.length === 0) {
    return <span className="text-xs text-zinc-500">Davr mavjud emas</span>;
  }

  return (
    <label className="flex items-center gap-1.5">
      <span className="text-xs text-zinc-500">Davr</span>
      <select
        value={current}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 rounded-lg border border-zinc-200 bg-white px-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-600"
      >
        {periods.map((value) => (
          <option key={value} value={value}>
            {formatPeriod(new Date(`${value}-01T00:00:00.000Z`))}
          </option>
        ))}
      </select>
    </label>
  );
}
