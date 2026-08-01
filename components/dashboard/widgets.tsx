import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { formatNumber } from "@/lib/format";

/**
 * Boshqaruv paneli vidjetlari.
 *
 * Barchasi server komponenti — grafik kutubxonasi yo'q, oddiy HTML/CSS.
 * Animatsiya `globals.css` dagi `.viz-bar` / `.viz-rise` klasslari orqali;
 * `prefers-reduced-motion` da o'chadi.
 */

const accents = {
  neutral: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
  good: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400",
  warning: "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400",
  critical: "bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400",
  info: "bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400",
};

export type Accent = keyof typeof accents;

export function KpiCard({
  icon: Icon,
  label,
  value,
  unit,
  hint,
  accent = "neutral",
  /** 0–100 — kartaning pastidagi ingichka indikator. */
  progress,
  delay = 0,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  unit?: string;
  hint?: string;
  accent?: Accent;
  progress?: number;
  delay?: number;
}) {
  const barColor =
    accent === "critical"
      ? "var(--status-critical)"
      : accent === "warning"
        ? "var(--status-warning)"
        : accent === "good"
          ? "var(--status-good)"
          : "var(--series-1)";

  return (
    <div
      className="viz viz-rise group rounded-xl border border-zinc-200 p-3 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={`grid size-8 shrink-0 place-items-center rounded-lg transition-transform group-hover:scale-105 ${accents[accent]}`}
        >
          <Icon className="size-4" />
        </span>
        {hint && (
          <span className="text-right text-xs text-zinc-500">{hint}</span>
        )}
      </div>

      <p className="mt-2.5 text-xs text-zinc-500">{label}</p>
      <p className="mt-0.5 text-2xl leading-tight font-semibold tracking-tight tabular-nums">
        {value}
        {unit && (
          <span className="ml-1 text-sm font-normal text-zinc-500">{unit}</span>
        )}
      </p>

      {progress !== undefined && (
        <div
          className="mt-2 h-1 w-full overflow-hidden rounded-full"
          style={{ background: "var(--viz-track)" }}
          role="presentation"
        >
          <div
            className="viz-bar h-full rounded-full"
            style={{
              width: `${Math.max(0, Math.min(100, progress))}%`,
              background: barColor,
              animationDelay: `${delay + 120}ms`,
            }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Halqa diagramma — tarif zonalari uchun.
 * `conic-gradient` bilan chiziladi; har bo'lak yonida yorliq va foiz
 * matn sifatida yoziladi, ya'ni rang yolg'iz ma'no tashimaydi.
 */
export function Donut({
  parts,
  centerLabel,
  centerValue,
}: {
  parts: { label: string; value: number; share: number; color: string }[];
  centerLabel: string;
  centerValue: string;
}) {
  // Har bo'lakning boshlanish burchagi — oldingilarining yig'indisi.
  // Render paytida o'zgaruvchi qayta tayinlanmaydi (React Compiler talabi).
  const starts = parts.map((_, index) =>
    parts.slice(0, index).reduce((sum, p) => sum + p.share, 0),
  );
  const stops = parts
    .map((p, index) => `${p.color} ${starts[index]}% ${starts[index] + p.share}%`)
    .join(", ");

  return (
    <div className="viz flex flex-wrap items-center gap-4">
      <div
        className="viz-fade relative size-32 shrink-0 rounded-full"
        style={{ background: `conic-gradient(${stops})` }}
        role="img"
        aria-label={parts
          .map((p) => `${p.label} ${formatNumber(p.share)}%`)
          .join(", ")}
      >
        <div className="absolute inset-[22%] grid place-items-center rounded-full bg-white dark:bg-zinc-950">
          <div className="text-center">
            <p className="text-sm font-semibold tabular-nums">{centerValue}</p>
            <p className="text-[10px] text-zinc-500">{centerLabel}</p>
          </div>
        </div>
      </div>

      <ul className="flex min-w-40 flex-1 flex-col gap-1.5">
        {parts.map((p) => (
          <li
            key={p.label}
            className="flex items-baseline justify-between gap-2 text-sm"
          >
            <span className="inline-flex items-center gap-1.5">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ background: p.color }}
              />
              {p.label}
            </span>
            <span className="tabular-nums">
              <span className="font-medium">{formatNumber(p.value)}</span>
              <span className="ml-1.5 text-xs text-zinc-500">
                {formatNumber(p.share)}%
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Ikki qismli qiyosiy bar — texnologik va tijoriy yo'qotish.
 * Segmentlar orasida 2px tirqish: ranglar bir-biriga yopishmasin.
 */
export function LossBars({
  items,
  emptyText = "Ma'lumot yo'q.",
}: {
  items: {
    label: string;
    technical: number;
    commercial: number;
    href?: string;
  }[];
  emptyText?: string;
}) {
  const max = Math.max(...items.map((i) => i.technical + Math.max(0, i.commercial)), 0);

  if (items.length === 0) {
    return <p className="py-8 text-center text-sm text-zinc-500">{emptyText}</p>;
  }

  return (
    <div className="viz flex flex-col gap-3">
      <div className="flex items-center gap-3 text-xs">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="size-2 rounded-full"
            style={{ background: "var(--status-warning)" }}
          />
          Texnologik
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="size-2 rounded-full"
            style={{ background: "var(--status-critical)" }}
          />
          Tijoriy
        </span>
      </div>

      <ul className="flex flex-col gap-2">
        {items.map((item, index) => {
          const commercial = Math.max(0, item.commercial);
          const tPct = max > 0 ? (item.technical / max) * 100 : 0;
          const cPct = max > 0 ? (commercial / max) * 100 : 0;

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
                  {item.commercial < 0 && (
                    <span className="ml-1.5 text-xs text-red-600 dark:text-red-400">
                      manfiy tijoriy
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-xs tabular-nums">
                  <span style={{ color: "var(--status-warning)" }}>
                    {formatNumber(item.technical)}
                  </span>
                  <span className="text-zinc-400"> · </span>
                  <span style={{ color: "var(--status-critical)" }}>
                    {formatNumber(item.commercial)}
                  </span>
                </span>
              </div>

              <div
                className="flex h-1.5 w-full gap-0.5 overflow-hidden rounded-full"
                style={{ background: "var(--viz-track)" }}
                role="presentation"
              >
                <div
                  className="viz-bar h-full rounded-full"
                  style={{
                    width: `${tPct}%`,
                    background: "var(--status-warning)",
                    animationDelay: `${index * 40}ms`,
                  }}
                />
                <div
                  className="viz-bar h-full rounded-full"
                  style={{
                    width: `${cPct}%`,
                    background: "var(--status-critical)",
                    animationDelay: `${index * 40 + 60}ms`,
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

/** Reyting ro'yxati — o'rin raqami bilan. */
export function RankList({
  items,
  tone = "neutral",
}: {
  items: { label: string; value: string; meta?: string; href?: string }[];
  tone?: "neutral" | "good" | "critical";
}) {
  const badge =
    tone === "good"
      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
      : tone === "critical"
        ? "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-400"
        : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";

  if (items.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-zinc-500">Ma&apos;lumot yo&apos;q.</p>
    );
  }

  return (
    <ol className="flex flex-col gap-1.5">
      {items.map((item, index) => (
        <li
          key={item.label}
          className="viz-rise flex items-center gap-2.5"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <span
            className={`grid size-6 shrink-0 place-items-center rounded-md text-xs font-semibold tabular-nums ${badge}`}
          >
            {index + 1}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm">
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
              <span className="ml-1.5 text-xs text-zinc-500">{item.meta}</span>
            )}
          </span>
          <span className="shrink-0 text-sm font-medium tabular-nums">
            {item.value}
          </span>
        </li>
      ))}
    </ol>
  );
}
