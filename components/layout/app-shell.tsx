"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { Header } from "./header";
import { Sidebar } from "./sidebar";

/**
 * Page shell — Sidebar, Header va Main panelni birlashtiradi.
 *
 * Client komponent, chunki mobil drawer holati Header (ochish tugmasi) va
 * Sidebar (drawer) orasida bo'lishiladi. `children` server'da render qilingan
 * holda uzatiladi — sahifalar Server Component bo'lib qolaveradi.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Boshqa bo'limga o'tilganda drawer yopiladi.
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Drawer ochiq bo'lganda Esc bilan yopish.
  useEffect(() => {
    if (!isSidebarOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setSidebarOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isSidebarOpen]);

  return (
    <div className="flex h-dvh gap-3 p-3">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <Header onMenuClick={() => setSidebarOpen(true)} />

        {/* Main panel — bu yerga har bir sahifaning page.tsx'i tushadi */}
        <main className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          {children}
        </main>
      </div>
    </div>
  );
}
