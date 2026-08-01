/**
 * Formatlash funksiyalari.
 *
 * DIQQAT: bu yerda `Intl` ATAYLAB ishlatilmaydi.
 *
 * `Intl.DateTimeFormat("uz-UZ", { month: "long" })` Node (server) va brauzer
 * (client) da HAR XIL natija beradi — ICU ma'lumotlari mos kelmaydi:
 * serverda "avgust, 2026", brauzerda "2026 M08". Bu React'da hidratsiya
 * xatosiga olib keladi va "2026 M08" o'zbekcha ham emas.
 *
 * Shuning uchun oy nomlari va sonlar qo'lda formatlanadi — natija serverda
 * ham, brauzerda ham bir xil va to'g'ri o'zbekcha bo'ladi.
 */

const MONTHS = [
  "yanvar",
  "fevral",
  "mart",
  "aprel",
  "may",
  "iyun",
  "iyul",
  "avgust",
  "sentabr",
  "oktabr",
  "noyabr",
  "dekabr",
];

/**
 * Sonni o'zbek yozuvida formatlaydi: minglar probel bilan, kasr vergul bilan.
 * Masalan: 1843.75 → "1 843,75"
 */
export function formatNumber(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";

  const n = Number(value);
  if (!Number.isFinite(n)) return "—";

  const negative = n < 0;
  const abs = Math.abs(n);

  // 2 xonagacha yaxlitlaymiz, keraksiz nollarni olib tashlaymiz.
  const rounded = Math.round(abs * 100) / 100;
  const [whole, fraction] = rounded.toFixed(2).split(".");

  // Minglar ajratgichi — uzuvsiz probel ( ), shunda son qator oxirida uzilmaydi.
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const trimmed = fraction.replace(/0+$/, "");

  return `${negative ? "−" : ""}${grouped}${trimmed ? `,${trimmed}` : ""}`;
}

export function formatKwh(value: unknown): string {
  if (value === null || value === undefined) return "—";
  return `${formatNumber(value)} kVt·s`;
}

export function formatKva(value: unknown): string {
  if (value === null || value === undefined) return "—";
  return `${formatNumber(value)} kVA`;
}

export function formatPercent(value: unknown): string {
  if (value === null || value === undefined) return "—";
  return `${formatNumber(value)}%`;
}

/** Sana: "01.08.2026" (UTC bo'yicha). */
export function formatDate(value: Date | null | undefined): string {
  if (!value) return "—";

  const day = String(value.getUTCDate()).padStart(2, "0");
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  return `${day}.${month}.${value.getUTCFullYear()}`;
}

/** Hisobot davri: "avgust 2026". */
export function formatPeriod(value: Date): string {
  return `${MONTHS[value.getUTCMonth()]} ${value.getUTCFullYear()}`;
}
