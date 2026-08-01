"use client";

import { useEffect, useState } from "react";

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

  // Boshqa bo'limga o'tilganda drawer Sidebar'ning o'zida yopiladi
  // (havola bosilganda) — effect kerak emas.

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
    <div className="flex h-dvh gap-1.5 p-1.5">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Header onMenuClick={() => setSidebarOpen(true)} />

        {/*
          Main panel — bu yerga har bir sahifaning page.tsx'i tushadi.

          Ataylab fon, ramka va burchaklarsiz: kontent sahifa foni ustida
          erkin turadi. Tarkibdagi kartalar va jadvallar o'z ramkasiga ega,
          shuning uchun qo'shimcha "oq quti" faqat ko'rishni qiyinlashtirardi.
        */}
        <main className="min-h-0 flex-1 overflow-y-auto px-1 py-1">
          {children}
        </main>
      </div>
    </div>
  );
}
