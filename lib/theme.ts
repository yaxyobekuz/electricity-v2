export type Theme = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "theme";

/**
 * Brauzerning `storage` hodisasi faqat BOSHQA tab'larda ishga tushadi.
 * Shu tab ichidagi o'zgarishni bildirish uchun o'z hodisamizni yuboramiz.
 */
export const THEME_CHANGE_EVENT = "theme-change";

/** `.dark` class'ini `<html>` ga qo'yadi yoki olib tashlaydi. */
export function applyTheme(theme: Theme) {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = theme === "dark" || (theme === "system" && prefersDark);

  document.documentElement.classList.toggle("dark", isDark);
}

export function readStoredTheme(): Theme {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "light" || stored === "dark" ? stored : "system";
}

/**
 * Sahifa chizilishidan OLDIN ishlashi kerak bo'lgan skript.
 *
 * Busiz "yorug'lik chaqnashi" (FOUC) yuz beradi: server har doim light
 * holatda HTML yuboradi, React esa hidratsiyadan keyingina temani qo'yadi —
 * natijada dark rejimdagi foydalanuvchi bir lahza oq ekranni ko'radi.
 *
 * try/catch kerak: localStorage bloklangan brauzerlarda (privacy rejimi)
 * xato sahifani butunlay to'xtatib qo'ymasligi uchun.
 */
export const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem("${THEME_STORAGE_KEY}");
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (stored === "dark" || (stored !== "light" && prefersDark)) {
      document.documentElement.classList.add("dark");
    }
  } catch (e) {}
})();
`;
