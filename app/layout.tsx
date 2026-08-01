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
        {/* React hidratsiyasidan oldin ishlaydi — dark rejimda oq chaqnash bo'lmaydi */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="h-full bg-zinc-100 dark:bg-zinc-950">
        {/* Page shell: chapda Sidebar, o'ngda Header + Main panel */}
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
