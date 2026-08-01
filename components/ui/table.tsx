import type { ReactNode } from "react";

/**
 * Jadval primitivlari. Keng jadval sahifani gorizontal scroll qilmasligi uchun
 * `Table` o'zining `overflow-x-auto` konteyneri ichida turadi.
 */

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
      <table className="w-full min-w-max border-collapse text-sm">
        {children}
      </table>
    </div>
  );
}

export function Th({
  children,
  align = "left",
}: {
  children: ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      scope="col"
      className={`border-b border-zinc-200 px-4 py-3 font-medium text-zinc-500 dark:border-zinc-800 ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  align = "left",
  muted = false,
  numeric = false,
}: {
  children: ReactNode;
  align?: "left" | "right";
  muted?: boolean;
  numeric?: boolean;
}) {
  return (
    <td
      className={`px-4 py-3 ${align === "right" ? "text-right" : "text-left"} ${
        muted ? "text-zinc-500" : ""
      } ${numeric ? "tabular-nums" : ""}`}
    >
      {children}
    </td>
  );
}

export function Tr({ children }: { children: ReactNode }) {
  return (
    <tr className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/60">
      {children}
    </tr>
  );
}

/** Ma'lumot yo'q holati. `colSpan` jadval ustunlari soniga teng bo'lishi kerak. */
export function EmptyRow({
  colSpan,
  children = "Ma'lumot topilmadi.",
}: {
  colSpan: number;
  children?: ReactNode;
}) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="px-4 py-12 text-center text-sm text-zinc-500"
      >
        {children}
      </td>
    </tr>
  );
}

/** Holat belgisi (badge). */
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  const tones = {
    neutral: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    success: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    warning: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    danger: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  };

  return (
    <span
      className={`inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/** Sahifa sarlavhasi — barcha bo'limlarda bir xil ko'rinish uchun. */
export function PageHeading({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div>
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      {description && (
        <p className="mt-1 text-sm text-zinc-500">{description}</p>
      )}
    </div>
  );
}
