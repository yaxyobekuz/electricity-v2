"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, Zap } from "lucide-react";

import { findActiveNavItem, navItems } from "./nav";

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const active = findActiveNavItem(pathname);

  return (
    <>
      {/* Mobil drawer orqa fon — faqat ochiq bo'lganda */}
      {isOpen && (
        <div
          onClick={onClose}
          aria-hidden
          className="fixed inset-0 z-40 bg-zinc-950/40 md:hidden"
        />
      )}

      {/*
        Mobil: `fixed` drawer, chapdan surilib chiqadi (oqimda joy egallamaydi).
        md+ : `static` — flex oqimining doimiy qismi.
      */}
      <aside
        className={`fixed inset-y-3 left-3 z-50 flex w-64 shrink-0 flex-col rounded-2xl border border-zinc-200 bg-white transition-transform duration-200 md:static md:inset-auto md:translate-x-0 dark:border-zinc-800 dark:bg-zinc-900 ${
          isOpen ? "translate-x-0" : "-translate-x-[120%]"
        }`}
      >
        <div className="flex items-center gap-2.5 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <span className="grid size-9 place-items-center rounded-xl bg-amber-400 text-zinc-950">
            <Zap className="size-5" strokeWidth={2.5} />
          </span>
          <span className="text-base font-semibold tracking-tight">
            Electricity
          </span>

          <button
            type="button"
            onClick={onClose}
            aria-label="Menyuni yopish"
            className="-mr-1 ml-auto grid size-8 place-items-center rounded-lg text-zinc-500 hover:bg-zinc-100 md:hidden dark:hover:bg-zinc-800"
          >
            <X className="size-4.5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          <ul className="flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive = active?.href === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={
                      isActive
                        ? "flex items-center gap-3 rounded-xl bg-zinc-900 px-3 py-2.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                        : "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                    }
                  >
                    <item.icon className="size-4.5 shrink-0" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
          <div className="flex items-center gap-3 rounded-xl px-2 py-1.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-zinc-200 text-sm font-semibold dark:bg-zinc-800">
              A
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">Admin</p>
              <p className="truncate text-xs text-zinc-500">Administrator</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
