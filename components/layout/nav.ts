import {
  FileText,
  Gauge,
  LayoutDashboard,
  Receipt,
  Users,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

/**
 * Sidebar navigatsiyasi va Header sarlavhasi shu bitta manbadan o'qiladi.
 * Yangi bo'lim qo'shilganda faqat shu ro'yxat yangilanadi.
 */
export const navItems: NavItem[] = [
  { label: "Boshqaruv paneli", href: "/", icon: LayoutDashboard },
  { label: "Iste'molchilar", href: "/consumers", icon: Users },
  { label: "Hisoblagichlar", href: "/meters", icon: Gauge },
  { label: "Ko'rsatkichlar", href: "/readings", icon: Zap },
  { label: "To'lovlar", href: "/payments", icon: Receipt },
  { label: "Tariflar", href: "/tariffs", icon: FileText },
  { label: "Hisobotlar", href: "/reports", icon: BarChart3 },
  { label: "Sozlamalar", href: "/settings", icon: Settings },
];

/** Joriy yo'lga mos bo'limni topadi (eng uzun mos prefiks bo'yicha). */
export function findActiveNavItem(pathname: string): NavItem | undefined {
  return navItems
    .filter((item) =>
      item.href === "/" ? pathname === "/" : pathname.startsWith(item.href),
    )
    .sort((a, b) => b.href.length - a.href.length)[0];
}
