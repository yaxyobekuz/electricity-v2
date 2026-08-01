"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

import {
  applyTheme,
  readStoredTheme,
  THEME_CHANGE_EVENT,
  THEME_STORAGE_KEY,
} from "@/lib/theme";
import type { Theme } from "@/lib/theme";

const options: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Yorug'", icon: Sun },
  { value: "dark", label: "Qorong'i", icon: Moon },
  { value: "system", label: "Tizim", icon: Monitor },
];

/**
 * localStorage — React'dan tashqaridagi store, shuning uchun uni effect bilan
 * emas, `useSyncExternalStore` bilan o'qiymiz. Bu hidratsiya mosligini
 * React o'zi hal qilishini ta'minlaydi: server "system" qiymatini beradi,
 * brauzer esa hidratsiyadan so'ng haqiqiy qiymatga o'tadi.
 */
function subscribe(onChange: () => void) {
  // `storage` — boshqa tab'da o'zgarsa; custom event — shu tab ichida.
  window.addEventListener("storage", onChange);
  window.addEventListener(THEME_CHANGE_EVENT, onChange);

  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
  };
}

export function ThemeToggle() {
  const theme = useSyncExternalStore<Theme>(
    subscribe,
    readStoredTheme,
    () => "system",
  );

  function selectTheme(next: Theme) {
    localStorage.setItem(THEME_STORAGE_KEY, next);
    applyTheme(next);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }

  // "Tizim" rejimida OS temasi o'zgarsa, sahifa darhol moslashadi.
  useEffect(() => {
    if (theme !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");

    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  return (
    <div
      role="radiogroup"
      aria-label="Rang rejimi"
      className="flex items-center rounded-lg border border-zinc-200 p-0.5 dark:border-zinc-800"
    >
      {options.map((option) => {
        const isSelected = theme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={option.label}
            title={option.label}
            onClick={() => selectTheme(option.value)}
            className={`grid size-6 place-items-center rounded-md transition-colors ${
              isSelected
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            <option.icon className="size-3.5" />
          </button>
        );
      })}
    </div>
  );
}
