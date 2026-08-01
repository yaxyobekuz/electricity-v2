import ExcelJS from "exceljs";

/**
 * "To'liq hisobot" Excel shablonini o'qiydi.
 *
 * Ustunlar QAT'IY POZITSIYA bo'yicha emas, sarlavha matni bo'yicha topiladi —
 * shablon kelajakda sayqallanganda (ustun qo'shilsa/joyi almashsa) import
 * buzilmasligi uchun.
 *
 * Sarlavha ikki qatorga yoyilgan (birlashtirilgan kataklar), shuning uchun
 * har bir ustun uchun bir necha qatordagi matn birlashtirib tekshiriladi.
 */

export type TpReportRow = {
  /** Excel'dagi qator raqami — xatoni ko'rsatish uchun. */
  excelRow: number;
  etkName: string | null;
  tpNumber: string;
  feederName: string;
  consumersTotal: number | null;
  consumersOnline: number | null;
  consumersOffline: number | null;
  meterType: string | null;
  meterSerial: string | null;
  coefficient: number | null;
  /** Joriy davr ko'rsatkichi. */
  meterValue: number | null;
  /** Oldingi davr ko'rsatkichi. */
  previousValue: number | null;
  /** Fayldagi "Farqi" — bizning hisobimiz bilan solishtirish uchun. */
  fileDifference: number | null;
  /** Fayldagi "Bir oylik iste'mol". */
  fileConsumedKwh: number | null;
  zoneT1: number | null;
  zoneT2: number | null;
  zoneT3: number | null;
  zoneT4: number | null;
  reactivePlus: number | null;
  reactiveMinus: number | null;
};

export type ParseResult = {
  /** Sarlavhadan aniqlangan joriy davr. */
  period: Date | null;
  /** Sarlavhadan aniqlangan oldingi davr. */
  prevPeriod: Date | null;
  rows: TpReportRow[];
  /** Faylni o'qishda uchragan muammolar — foydalanuvchiga ko'rsatiladi. */
  issues: string[];
};

type ColumnMap = Partial<Record<keyof TpReportRow | "currentDate" | "prevDate", number>>;

/** Sarlavha matnini solishtirish uchun soddalashtiradi. */
function normalize(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/['’`ʻ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cellText(cell: ExcelJS.Cell | undefined): string {
  if (!cell) return "";
  const v = cell.value;
  if (v === null || v === undefined) return "";
  if (typeof v === "object" && v !== null) {
    // Formula kataklari { formula, result } ko'rinishida keladi.
    if ("result" in v) return String((v as { result: unknown }).result ?? "");
    if ("richText" in v) {
      return (v as { richText: { text: string }[] }).richText
        .map((t) => t.text)
        .join("");
    }
    if ("text" in v) return String((v as { text: unknown }).text ?? "");
  }
  return String(v);
}

function cellNumber(cell: ExcelJS.Cell | undefined): number | null {
  const text = cellText(cell).replace(/\s/g, "").replace(",", ".");
  if (text === "") return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

/** "01.08.2026" yoki "2026-08-01" ko'rinishidan oyning 1-kunini ajratadi. */
function extractPeriod(text: string): Date | null {
  const dotted = /(\d{2})\.(\d{2})\.(\d{4})/.exec(text);
  if (dotted) {
    return new Date(Date.UTC(Number(dotted[3]), Number(dotted[2]) - 1, 1));
  }

  const dashed = /(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (dashed) {
    return new Date(Date.UTC(Number(dashed[1]), Number(dashed[2]) - 1, 1));
  }

  return null;
}

/**
 * Sarlavha qatorini topadi va ustunlarni xaritalaydi.
 * Har bir ustun uchun sarlavha qatoridan boshlab 2 qator matni birlashtiriladi.
 */
function mapColumns(
  sheet: ExcelJS.Worksheet,
  issues: string[],
): { map: ColumnMap; headerRow: number; period: Date | null; prevPeriod: Date | null } {
  let headerRow = 0;

  // Sarlavha qatori — ichida "tp" va "fider" so'zlari bor qator.
  for (let r = 1; r <= Math.min(sheet.rowCount, 15); r++) {
    const joined = normalize(
      sheet.getRow(r).values ? Object.values(sheet.getRow(r).values as object).join(" ") : "",
    );
    if (joined.includes("tp") && joined.includes("fider")) {
      headerRow = r;
      break;
    }
  }

  if (headerRow === 0) {
    issues.push(
      "Sarlavha qatori topilmadi. Faylda 'TP nomer' va 'Fiderlar nomi' ustunlari bo'lishi kerak.",
    );
    return { map: {}, headerRow: 0, period: null, prevPeriod: null };
  }

  const map: ColumnMap = {};
  const readingColumns: { col: number; date: Date }[] = [];

  for (let c = 1; c <= sheet.columnCount; c++) {
    // Sarlavha ikki qatorga yoyilgani uchun ikkalasini birlashtiramiz.
    const text = normalize(
      [cellText(sheet.getRow(headerRow).getCell(c)), cellText(sheet.getRow(headerRow + 1).getCell(c))]
        .filter(Boolean)
        .join(" "),
    );
    if (!text) continue;

    // Ko'rsatkich ustunlari — ichida sana bor.
    const date = extractPeriod(text);
    if (date && text.includes("korsatkich")) {
      readingColumns.push({ col: c, date });
      continue;
    }

    if (text.includes("tp nomer") || text.includes("tp raqam")) map.tpNumber = c;
    else if (text.includes("fider")) map.feederName = c;
    else if (text.includes("etk")) map.etkName = c;
    else if (text.includes("jami istemolchi")) map.consumersTotal = c;
    else if (text.includes("aloqaga chiqayotgan")) map.consumersOnline = c;
    else if (text.includes("aloqadan chiqib")) map.consumersOffline = c;
    else if (text.includes("hisoblagichlar turi")) map.meterType = c;
    else if (text.includes("hisoblagichlar raqami")) map.meterSerial = c;
    else if (text.includes("koyfisent") || text.includes("koeffitsient"))
      map.coefficient = c;
    else if (text.includes("farq")) map.fileDifference = c;
    else if (text.includes("bir oylik")) map.fileConsumedKwh = c;
    else if (text === "t1") map.zoneT1 = c;
    else if (text === "t2") map.zoneT2 = c;
    else if (text === "t3") map.zoneT3 = c;
    else if (text === "t4") map.zoneT4 = c;
    else if (text.startsWith("r+")) map.reactivePlus = c;
    else if (text.startsWith("r-")) map.reactiveMinus = c;
  }

  // Ko'rsatkich ustunlaridan kechrog'i — joriy davr, erterog'i — oldingi.
  readingColumns.sort((a, b) => a.date.getTime() - b.date.getTime());

  let period: Date | null = null;
  let prevPeriod: Date | null = null;

  if (readingColumns.length >= 2) {
    prevPeriod = readingColumns[0].date;
    period = readingColumns[readingColumns.length - 1].date;
    map.previousValue = readingColumns[0].col;
    map.meterValue = readingColumns[readingColumns.length - 1].col;
  } else if (readingColumns.length === 1) {
    period = readingColumns[0].date;
    map.meterValue = readingColumns[0].col;
    issues.push(
      "Faylda faqat bitta ko'rsatkich ustuni topildi — oldingi davr qiymati bazadan olinadi.",
    );
  } else {
    issues.push(
      "Ko'rsatkich ustunlari topilmadi. Sarlavhada sana bo'lishi kerak, masalan \"01.08.2026 kungi ko'rsatkichi\".",
    );
  }

  for (const [field, label] of [
    ["tpNumber", "TP nomer"],
    ["feederName", "Fider nomi"],
    ["coefficient", "Koeffitsient"],
  ] as const) {
    if (!map[field]) issues.push(`"${label}" ustuni topilmadi.`);
  }

  return { map, headerRow, period, prevPeriod };
}

export async function parseTpReport(
  buffer: ArrayBuffer,
  sheetName?: string,
): Promise<ParseResult> {
  const issues: string[] = [];
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheet = sheetName
    ? workbook.getWorksheet(sheetName)
    : workbook.worksheets[0];

  if (!sheet) {
    return {
      period: null,
      prevPeriod: null,
      rows: [],
      issues: [`Varaq topilmadi${sheetName ? `: "${sheetName}"` : ""}.`],
    };
  }

  const { map, headerRow, period, prevPeriod } = mapColumns(sheet, issues);
  if (!headerRow || !map.tpNumber || !map.feederName) {
    return { period, prevPeriod, rows: [], issues };
  }

  const get = (row: ExcelJS.Row, col: number | undefined) =>
    col ? row.getCell(col) : undefined;

  const rows: TpReportRow[] = [];
  const seenTp = new Set<string>();

  // Sarlavha 2 qator egallaydi, ma'lumot undan keyin boshlanadi.
  for (let r = headerRow + 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);

    const tpNumber = cellText(get(row, map.tpNumber)).trim();
    const feederName = cellText(get(row, map.feederName)).trim();

    // Bo'sh yoki "Jami" kabi yig'indi qatorlarini o'tkazib yuboramiz.
    if (!tpNumber || !feederName) continue;
    if (/^(jami|итого|жами)$/i.test(feederName) || /^(jami|итого|жами)$/i.test(tpNumber)) {
      continue;
    }

    if (seenTp.has(tpNumber)) {
      issues.push(`${r}-qator: TP "${tpNumber}" faylda takrorlangan — birinchisi olindi.`);
      continue;
    }
    seenTp.add(tpNumber);

    rows.push({
      excelRow: r,
      etkName: cellText(get(row, map.etkName)).trim() || null,
      tpNumber,
      feederName,
      consumersTotal: cellNumber(get(row, map.consumersTotal)),
      consumersOnline: cellNumber(get(row, map.consumersOnline)),
      consumersOffline: cellNumber(get(row, map.consumersOffline)),
      meterType: cellText(get(row, map.meterType)).trim() || null,
      meterSerial: cellText(get(row, map.meterSerial)).trim() || null,
      coefficient: cellNumber(get(row, map.coefficient)),
      meterValue: cellNumber(get(row, map.meterValue)),
      previousValue: cellNumber(get(row, map.previousValue)),
      fileDifference: cellNumber(get(row, map.fileDifference)),
      fileConsumedKwh: cellNumber(get(row, map.fileConsumedKwh)),
      zoneT1: cellNumber(get(row, map.zoneT1)),
      zoneT2: cellNumber(get(row, map.zoneT2)),
      zoneT3: cellNumber(get(row, map.zoneT3)),
      zoneT4: cellNumber(get(row, map.zoneT4)),
      reactivePlus: cellNumber(get(row, map.reactivePlus)),
      reactiveMinus: cellNumber(get(row, map.reactiveMinus)),
    });
  }

  if (rows.length === 0) issues.push("Faylda ma'lumot qatori topilmadi.");

  return { period, prevPeriod, rows, issues };
}

/** Faylning varaq nomlarini qaytaradi — foydalanuvchi qaysi birini import qilishni tanlaydi. */
export async function listSheets(buffer: ArrayBuffer): Promise<string[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  return workbook.worksheets.map((w) => w.name);
}
