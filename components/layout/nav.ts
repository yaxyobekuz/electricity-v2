import {
  Activity,
  Boxes,
  LayoutDashboard,
  Upload,
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
 *
 * QOIDA: bu ro'yxatda faqat HAQIQATDA MAVJUD sahifalar bo'lishi kerak —
 * har bir `href` uchun `app/<href>/page.tsx` mavjud bo'lsin.
 */
export const navItems: NavItem[] = [
  { label: "Boshqaruv paneli", href: "/", icon: LayoutDashboard },
  // Mustaqil bo'limlar: ro'yxat + to'liq boshqaruv.
  { label: "Fiderlar", href: "/feeders", icon: Zap },
  { label: "TP'lar", href: "/tp", icon: Boxes },
  { label: "Fider ko'rsatkichlari", href: "/feeder-readings", icon: Activity },
  { label: "Excel import", href: "/import", icon: Upload },
];

/** Joriy yo'lga mos bo'limni topadi (eng uzun mos prefiks bo'yicha). */
export function findActiveNavItem(pathname: string): NavItem | undefined {
  return navItems
    .filter((item) =>
      item.href === "/" ? pathname === "/" : pathname.startsWith(item.href),
    )
    .sort((a, b) => b.href.length - a.href.length)[0];
}
