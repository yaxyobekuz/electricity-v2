import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type Crumb = {
  label: string;
  href?: string;
};

/**
 * Ierarxiyadagi o'rinni ko'rsatadi:
 * Podstansiya → Ввод → Fider → TP
 *
 * Oxirgi element joriy sahifa — havola emas.
 */
export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Ierarxiya" className="flex flex-wrap items-center gap-0.5 text-xs">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={`${item.label}-${index}`} className="flex items-center gap-0.5">
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="rounded px-1 py-0.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className="px-1 py-0.5 font-medium"
                aria-current={isLast ? "page" : undefined}
              >
                {item.label}
              </span>
            )}
            {!isLast && <ChevronRight className="size-3 shrink-0 text-zinc-400" />}
          </span>
        );
      })}
    </nav>
  );
}

/** Jadval katagidagi havola — qatorlardan tafsilotga o'tish uchun. */
export function CellLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="font-medium underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-900 dark:decoration-zinc-600 dark:hover:decoration-zinc-100"
    >
      {children}
    </Link>
  );
}
