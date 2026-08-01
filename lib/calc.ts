/**
 * Tizimning barcha hisob-kitoblari shu yerda.
 *
 * Qo'lda kiritish ham, Excel import ham AYNAN shu funksiyalarni chaqiradi —
 * aks holda ikki yo'l bilan kiritilgan ma'lumot bir-biriga mos kelmay qoladi.
 *
 * Manba formulalar (.claude/docs/ hisobotlaridan tekshirilgan):
 *   farq          = joriy − oldingi
 *   iste'mol      = farq × koeffitsient
 *   texnologik    = iste'mol × foiz / 100        (hujjatda 12%)
 *   tijoriy       = iste'mol − oqim − texnologik
 */

/** Prisma `Decimal`, `string` yoki `number` — hammasini songa keltiradi. */
export function toNumber(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export type ReadingInput = {
  meterValue: number;
  previousValue: number;
  coefficient: number;
  /** Birinchi o'lchov — solishtirish uchun oldingi qiymat yo'q. */
  isBaseline?: boolean;
};

export type ReadingResult = {
  difference: number;
  consumedKwh: number;
};

/**
 * Ko'rsatkichdan iste'molni hisoblaydi.
 *
 * Boshlang'ich o'lchovda iste'mol NOLGA tenglanadi: oldingi ko'rsatkich
 * noma'lum bo'lgani uchun farq sifatida hisoblagichning butun umrlik
 * ko'rsatkichi olinib ketardi va natija yuz barobar shishib ketardi.
 */
export function computeReading({
  meterValue,
  previousValue,
  coefficient,
  isBaseline = false,
}: ReadingInput): ReadingResult {
  if (isBaseline) {
    return { difference: 0, consumedKwh: 0 };
  }

  const difference = meterValue - previousValue;
  return {
    difference,
    consumedKwh: difference * coefficient,
  };
}

export type LossInput = {
  consumedKwh: number;
  /** TP hisoblagichlari bo'yicha real o'tgan miqdor. O'lchanmagan bo'lsa null. */
  electricFlowKwh?: number | null;
  technicalLossPercent?: number;
};

export type LossResult = {
  technicalLossKwh: number;
  commercialLossKwh: number;
};

export function computeLosses({
  consumedKwh,
  electricFlowKwh,
  technicalLossPercent = 12,
}: LossInput): LossResult {
  const technicalLossKwh = (consumedKwh * technicalLossPercent) / 100;
  const flow = electricFlowKwh ?? 0;

  return {
    technicalLossKwh,
    commercialLossKwh: consumedKwh - flow - technicalLossKwh,
  };
}

/**
 * Ko'rsatkich ogohlantirishlari — kiritilgan qiymat shubhali bo'lsa
 * foydalanuvchini ogohlantirish uchun. Saqlashni to'xtatmaydi.
 */
export function readingWarnings(input: ReadingInput): string[] {
  const warnings: string[] = [];

  if (input.isBaseline) return warnings;

  if (input.meterValue < input.previousValue) {
    warnings.push(
      "Joriy ko'rsatkich oldingisidan kichik. Hisoblagich almashtirilgan yoki " +
        "qiymat xato kiritilgan bo'lishi mumkin — farq manfiy chiqadi.",
    );
  }

  if (input.meterValue === input.previousValue) {
    warnings.push(
      "Joriy va oldingi ko'rsatkich bir xil — iste'mol nol deb hisoblanadi.",
    );
  }

  if (input.coefficient <= 0) {
    warnings.push("Koeffitsient noldan katta bo'lishi kerak.");
  }

  return warnings;
}

// ─────────────────────────── Davr (period) ───────────────────────────

/** Sanani oyning 1-kuniga keltiradi (UTC). Hisobot davri kaliti. */
export function toPeriod(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

/** Joriy oy. */
export function currentPeriod(): Date {
  return toPeriod(new Date());
}

/** "2026-08" ko'rinishidagi matnni davrga aylantiradi. */
export function parsePeriod(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;

  return new Date(Date.UTC(year, month - 1, 1));
}

/** Davrni `<input type="month">` uchun "2026-08" ko'rinishiga keltiradi. */
export function formatPeriodInput(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/** Oldingi oy. */
export function previousPeriod(period: Date): Date {
  return new Date(Date.UTC(period.getUTCFullYear(), period.getUTCMonth() - 1, 1));
}

/**
 * Davrlar ro'yxatini `<select>` qiymatlariga aylantiradi.
 * Bu yerda turadi, `period-select.tsx` da emas: u "use client" moduli,
 * server komponentlari undan oddiy funksiya chaqira olmaydi.
 */
export function toPeriodOptions(periods: Date[]): string[] {
  return periods.map(formatPeriodInput);
}
