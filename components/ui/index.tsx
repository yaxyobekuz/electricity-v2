import type { ReactNode } from "react";

/**
 * Umumiy UI primitivlari. Zichlik AGENTS.md dagi shkalaga mos:
 * ixcham padding, `rounded-lg`/`rounded-xl`, kichik ikonkalar.
 */

// ─────────────────────────── Sarlavha ───────────────────────────

export function PageHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div>
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {description && (
          <p className="mt-0.5 text-sm text-zinc-500">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

// ─────────────────────────── Jadval ───────────────────────────

/** Keng jadval sahifani gorizontal scroll qilmasligi uchun o'z konteynerida. */
export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
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
      // Fon sahifa foni bilan bir xil — sticky sarlavha scroll paytida
      // ostidagi qatorlarni to'liq berkitishi kerak.
      className={`sticky top-0 z-10 border-b border-zinc-200 bg-white px-2.5 py-2 font-medium whitespace-nowrap text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 ${
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
  strong = false,
}: {
  children: ReactNode;
  align?: "left" | "right";
  muted?: boolean;
  numeric?: boolean;
  strong?: boolean;
}) {
  return (
    <td
      className={`px-2.5 py-1.5 whitespace-nowrap ${
        align === "right" ? "text-right" : "text-left"
      } ${muted ? "text-zinc-500" : ""} ${numeric ? "tabular-nums" : ""} ${
        strong ? "font-medium" : ""
      }`}
    >
      {children}
    </td>
  );
}

export function Tr({ children }: { children: ReactNode }) {
  return (
    <tr className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50 dark:border-zinc-800/60 dark:hover:bg-zinc-800/40">
      {children}
    </tr>
  );
}

/** Yig'indi qatori — jadval oxirida. */
export function TotalRow({ children }: { children: ReactNode }) {
  return (
    <tr className="border-t-2 border-zinc-300 bg-zinc-50/80 font-semibold dark:border-zinc-700 dark:bg-zinc-800/60">
      {children}
    </tr>
  );
}

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
        className="px-3 py-10 text-center text-sm text-zinc-500"
      >
        {children}
      </td>
    </tr>
  );
}

// ─────────────────────────── Belgilar ───────────────────────────

const badgeTones = {
  neutral: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  success:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  danger: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  info: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
};

export type BadgeTone = keyof typeof badgeTones;

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: BadgeTone;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium whitespace-nowrap ${badgeTones[tone]}`}
    >
      {children}
    </span>
  );
}

// ─────────────────────────── Kartalar ───────────────────────────

export function Card({
  title,
  children,
  action,
}: {
  title?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-zinc-200 dark:border-zinc-800">
      {title && (
        <header className="flex items-center justify-between gap-2 border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
          <h3 className="text-sm font-semibold">{title}</h3>
          {action}
        </header>
      )}
      <div className="p-3">{children}</div>
    </section>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: BadgeTone;
}) {
  const valueTone =
    tone === "danger"
      ? "text-red-600 dark:text-red-400"
      : tone === "warning"
        ? "text-amber-600 dark:text-amber-400"
        : tone === "success"
          ? "text-emerald-600 dark:text-emerald-400"
          : "";

  return (
    <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
      <p className="text-xs text-zinc-500">{label}</p>
      <p
        className={`mt-1 text-xl font-semibold tracking-tight tabular-nums ${valueTone}`}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

// ─────────────────────────── Xabarlar ───────────────────────────

export function Notice({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "warning" | "danger" | "success";
  title?: string;
  children: ReactNode;
}) {
  const tones = {
    info: "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-200",
    warning:
      "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200",
    danger:
      "border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200",
    success:
      "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200",
  };

  return (
    <div className={`rounded-xl border px-3 py-2 text-sm ${tones[tone]}`}>
      {title && <p className="font-medium">{title}</p>}
      <div className={title ? "mt-0.5" : ""}>{children}</div>
    </div>
  );
}

// ─────────────────────────── Forma ───────────────────────────

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
        {label}
      </span>
      {children}
      {hint && !error && <span className="text-xs text-zinc-500">{hint}</span>}
      {error && (
        <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
      )}
    </label>
  );
}

const controlClass =
  "h-8 w-full rounded-lg border border-zinc-200 bg-white px-2 text-sm outline-none placeholder:text-zinc-400 focus:border-zinc-400 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-600";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${controlClass} ${props.className ?? ""}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={`${controlClass} ${props.className ?? ""}`} />
  );
}

const buttonTones = {
  primary:
    "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200",
  secondary:
    "border border-zinc-200 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800",
  danger:
    "border border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/50",
};

export function Button({
  tone = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: keyof typeof buttonTones;
}) {
  return (
    <button
      {...props}
      className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 ${buttonTones[tone]} ${className}`}
    />
  );
}
