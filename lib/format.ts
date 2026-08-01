/** Barcha sahifalarda bir xil formatlash uchun umumiy funksiyalar. */

const numberFormatter = new Intl.NumberFormat("uz-UZ", {
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("uz-UZ", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

const periodFormatter = new Intl.DateTimeFormat("uz-UZ", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** Prisma `Decimal` ham, `number` ham qabul qilinadi. */
export function formatNumber(value: unknown): string {
  return numberFormatter.format(Number(value ?? 0));
}

export function formatMoney(value: unknown): string {
  return `${numberFormatter.format(Number(value ?? 0))} so'm`;
}

export function formatKwh(value: unknown): string {
  return `${numberFormatter.format(Number(value ?? 0))} kVt·s`;
}

export function formatDate(value: Date | null | undefined): string {
  return value ? dateFormatter.format(value) : "—";
}

/** Hisobot davri: "avgust 2026". */
export function formatPeriod(value: Date): string {
  return periodFormatter.format(value);
}

/** Joriy oyning birinchi kuni — hisobot davri kaliti. */
export function currentPeriod(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}
