import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { AppShell } from "@/components/layout/app-shell";
import { themeInitScript } from "@/lib/theme";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Electricity — Boshqaruv tizimi",
  description: "Elektr energiyasi iste'moli hisobi va boshqaruvi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: pastdagi skript `<html>` ga `.dark` class'ini
    // qo'shadi, ya'ni server yuborgan HTML'dan farq qiladi. Bu ataylab.
    <html
      lang="uz"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/*
          Tema skripti — ATAYLAB xom `<script>` tegi.

          U HTML tahlili paytida SINXRON bajariladi, ya'ni sahifa birinchi
          marta chizilishidan oldin `.dark` class'i qo'yiladi va qorong'i
          rejimdagi foydalanuvchi oq chaqnashni (FOUC) ko'rmaydi.

          `next/script` + `beforeInteractive` bu yerda TO'G'RI KELMAYDI:
          tekshirildi — Next.js skriptni `__next_s` navbatiga qo'yadi va uni
          o'z bootstrap'idan keyin bajaradi, ya'ni chaqnash qaytadi.

          React 19 komponent ichidagi `<script>` uchun konsolga ogohlantirish
          beradi ("Scripts inside React components are never executed when
          rendering on the client"). Bu bizning holatda kutilgan xatti-harakat:
          skript faqat serverdan kelgan HTML'dan bir marta ishlashi kerak,
          client navigatsiyada qayta ishlashi shart emas.
        */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      {/*
        Sahifa foni oddiy: kontent to'g'ridan-to'g'ri shu fon ustida turadi.
        Sidebar va Header o'z ramkasi bilan ajralib turadi.
      */}
      <body className="h-full bg-white dark:bg-zinc-950">
        {/* Page shell: chapda Sidebar, o'ngda Header + Main panel */}
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
