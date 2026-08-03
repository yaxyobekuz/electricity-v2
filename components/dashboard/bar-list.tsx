import Link from "next/link";

import { formatNumber } from "@/lib/format";

/**
 * Gorizontal bar ro'yxati — kattalikni solishtirish uchun.
 *
 * Har bir qatorda qiymat MATN sifatida ham yozilgan: rang kontrasti past
 * bo'lgan holatlarda ham ma'lumot o'qiladi (dataviz qoidasi: "relief" —
 * ko'rinadigan yorliq yoki jadval).
 */

export type BarItem = {
  label: string;
  value: number;
  /** Qiymat yonida ko'rsatiladigan qo'shimcha matn. */
  meta?: string;
  href?: string;
  color?: string;
};

export function BarList({
  items,
  unit = "kVt·s",
  color = "var(--series-1)",
  emptyText = "Ma'lumot yo'q.",
}: {
  items: BarItem[];
  unit?: string;
  color?: string;
  emptyText?: string;
}) {
  const max = Math.max(...items.map((i) => Math.abs(i.value)), 0);

  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-zinc-500">{emptyText}</p>
    );
  }

  return (
    <div className="overflow-y-auto h-[245px]">
      <ul className="viz flex flex-col gap-2">
        {items.map((item, index) => {
          const pct = max > 0 ? (Math.abs(item.value) / max) * 100 : 0;

          return (
            <li key={item.label} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm">
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-900 dark:decoration-zinc-600 dark:hover:decoration-zinc-100"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    item.label
                  )}
                  {item.meta && (
                    <span className="ml-1.5 text-xs text-zinc-500">
                      {item.meta}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-sm font-medium tabular-nums">
                  {formatNumber(item.value)}
                  {unit && (
                    <span className="ml-1 text-xs text-zinc-500">{unit}</span>
                  )}
                </span>
              </div>

              <div
                className="h-1.5 w-full overflow-hidden rounded-full"
                style={{ background: "var(--viz-track)" }}
                role="presentation"
              >
                <div
                  className="viz-bar h-full rounded-full"
                  style={{
                    width: `${pct}%`,
                    background: item.color ?? color,
                    animationDelay: `${index * 45}ms`,
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Ikki seriyali bar — masalan "aloqada" va "aloqadan chiqqan".
 * Rang yolg'iz ma'no tashimasligi uchun legenda majburiy.
 */
export function DualBarList({
  items,
  labels,
  emptyText = "Ma'lumot yo'q.",
}: {
  items: { label: string; a: number; b: number; href?: string }[];
  labels: [string, string];
  emptyText?: string;
}) {
  const max = Math.max(...items.map((i) => i.a + i.b), 0);

  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-zinc-500">{emptyText}</p>
    );
  }

  return (
    <div className="viz flex flex-col gap-3">
      <div className="flex items-center gap-3 text-xs">
        {labels.map((label, index) => (
          <span key={label} className="inline-flex items-center gap-1.5">
            <span
              className="size-2 rounded-full"
              style={{
                background: index === 0 ? "var(--series-1)" : "var(--series-2)",
              }}
            />
            {label}
          </span>
        ))}
      </div>

      <ul className="flex flex-col gap-2">
        {items.map((item, index) => {
          const aPct = max > 0 ? (item.a / max) * 100 : 0;
          const bPct = max > 0 ? (item.b / max) * 100 : 0;

          return (
            <li key={item.label} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm">
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-900 dark:decoration-zinc-600 dark:hover:decoration-zinc-100"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    item.label
                  )}
                </span>
                <span className="shrink-0 text-xs tabular-nums">
                  <span className="font-medium">{formatNumber(item.a)}</span>
                  <span className="text-zinc-400"> / </span>
                  <span className="text-zinc-500">{formatNumber(item.b)}</span>
                </span>
              </div>

              {/* Segmentlar orasida 2px tirqish — ranglar bir-biriga yopishmasin */}
              <div
                className="flex h-1.5 w-full gap-0.5 overflow-hidden rounded-full"
                style={{ background: "var(--viz-track)" }}
                role="presentation"
              >
                <div
                  className="viz-bar h-full rounded-full"
                  style={{
                    width: `${aPct}%`,
                    background: "var(--series-1)",
                    animationDelay: `${index * 45}ms`,
                  }}
                />
                <div
                  className="viz-bar h-full rounded-full"
                  style={{
                    width: `${bPct}%`,
                    background: "var(--series-2)",
                    animationDelay: `${index * 45 + 60}ms`,
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
