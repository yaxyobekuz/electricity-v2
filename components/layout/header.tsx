"use client";

import { usePathname } from "next/navigation";
import { Bell, Menu, Search } from "lucide-react";

import { findActiveNavItem } from "./nav";
import { ThemeToggle } from "./theme-toggle";

type HeaderProps = {
  onMenuClick: () => void;
};

export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const active = findActiveNavItem(pathname);

  return (
    <header className="flex h-11 shrink-0 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-2 sm:px-3 dark:border-zinc-800 dark:bg-zinc-900">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Menyuni ochish"
        className="grid size-7 shrink-0 place-items-center rounded-lg text-zinc-600 transition-colors hover:bg-zinc-100 md:hidden dark:text-zinc-400 dark:hover:bg-zinc-800"
      >
        <Menu className="size-4" />
      </button>

      <h1 className="truncate text-sm font-semibold tracking-tight">
        {active?.label ?? "Electricity"}
      </h1>

      <div className="relative ml-auto hidden lg:block">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-zinc-400" />
        <input
          type="search"
          placeholder="Qidirish..."
          aria-label="Qidirish"
          className="h-7 w-56 rounded-lg border border-zinc-200 bg-zinc-50 pr-2.5 pl-8 text-sm outline-none placeholder:text-zinc-400 focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-600"
        />
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1.5 lg:ml-0">
        <ThemeToggle />

        <button
          type="button"
          aria-label="Bildirishnomalar"
          className="grid size-7 shrink-0 place-items-center rounded-lg border border-zinc-200 text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          <Bell className="size-4" />
        </button>
      </div>
    </header>
  );
}
