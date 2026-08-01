"use client";

import { usePathname } from "next/navigation";
import { Bell, Menu, Search } from "lucide-react";

import { findActiveNavItem } from "./nav";

type HeaderProps = {
  onMenuClick: () => void;
};

export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const active = findActiveNavItem(pathname);

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 sm:px-5 dark:border-zinc-800 dark:bg-zinc-900">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Menyuni ochish"
        className="-ml-1 grid size-9 shrink-0 place-items-center rounded-xl text-zinc-600 transition-colors hover:bg-zinc-100 md:hidden dark:text-zinc-400 dark:hover:bg-zinc-800"
      >
        <Menu className="size-4.5" />
      </button>

      <h1 className="truncate text-lg font-semibold tracking-tight">
        {active?.label ?? "Electricity"}
      </h1>

      <div className="relative ml-auto hidden lg:block">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
        <input
          type="search"
          placeholder="Qidirish..."
          aria-label="Qidirish"
          className="h-9 w-64 rounded-xl border border-zinc-200 bg-zinc-50 pr-3 pl-9 text-sm outline-none placeholder:text-zinc-400 focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-600"
        />
      </div>

      <button
        type="button"
        aria-label="Bildirishnomalar"
        className="ml-auto grid size-9 shrink-0 place-items-center rounded-xl border border-zinc-200 text-zinc-600 transition-colors hover:bg-zinc-100 lg:ml-0 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800"
      >
        <Bell className="size-4.5" />
      </button>
    </header>
  );
}
