<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Electricity — loyiha qoidalari

Elektr tarmog'idagi oylik iste'mol va yo'qotishlarni hisobga olish tizimi.

Manba hujjatlar: `.claude/docs/` — `info.md` (ierarxiya izohi),
`toliq_hisobot.xlsx` (TP darajasidagi kirish shabloni),
`umumiy_hisobot.xlsx` (fider darajasidagi yig'ma hisobot).

## Domen — eng muhimi

```
ETK → Podstansiya → Ввод (Т1/Т2) → Fider (10 kV) → TP → Abonent
```

- **Ввод** — podstansiya **ichidagi** katta kuch transformatori (Т1 25 000 kVA, Т2 40 000 kVA).
- **TP** — mahallalardagi, **ko'chadagi** kichik transformator punkti.

Bu ikkisi butunlay boshqa narsa. Aralashtirib yuborilmasin.

## Hisob-kitob — yagona manba `lib/calc.ts`

Qo'lda kiritish ham, Excel import ham **aynan shu funksiyalarni** chaqiradi.
Formulani boshqa joyda takrorlama.

```
farq       = joriy ko'rsatkich − oldingi ko'rsatkich
iste'mol   = farq × koeffitsient
texnologik = iste'mol × 12%
tijoriy    = iste'mol − elektr oqimi − texnologik
```

Ikki darajada o'lchov olinadi va **ikkalasining ham o'z koeffitsienti bor**:

| Daraja | Model | Koeffitsient manbai | Qiymatlar |
|---|---|---|---|
| Fider | `FeederReading` | `Feeder.coefficient` | 1000–6000 |
| TP | `TpReading` | `TpPoint.coefficient` | 20–120 |

### Ikki qoida — buzilmasin

1. **Birinchi o'lchov (`isBaseline`)** — iste'mol NOLGA tenglanadi.
   Oldingi ko'rsatkich noma'lum bo'lgani uchun farq sifatida hisoblagichning
   butun umrlik ko'rsatkichi olinib ketadi va natija yuz barobar shishadi.

2. **Elektr oqimi QO'LDA KIRITILMAYDI** — u fiderga ulangan TP'lar
   iste'moli yig'indisi (`lib/reports.ts`). Haqiqiy hisobotda tekshirilgan:
   Jo'jaxona TP yig'indisi 317 911,8 = Excel'dagi "Elektr oqimi" qiymati.

   Fiderga TP biriktirilmagan bo'lsa oqim **nol emas, noma'lum** — bunda
   tijoriy yo'qotish hisoblanmaydi, aks holda butun iste'mol "o'g'irlik"
   bo'lib ko'rinadi.

3. **Manfiy tijoriy yo'qotish** = TP yig'indisi fider iste'molidan katta.
   Fizikaviy imkonsiz, ma'lumotda xato bor degani — foydalanuvchiga
   ogohlantirish ko'rsatiladi, jimgina yashirilmaydi.

## Excel import

`lib/import/parse-excel.ts` — ustunlarni **qat'iy pozitsiya bo'yicha emas,
sarlavha matni bo'yicha** topadi. Shablon kelajakda sayqallanadi, shuning
uchun ustun qo'shilishi/joyi almashishi importni buzmasligi kerak.

`lib/import/import-tp-report.ts` — `dryRun` rejimi **majburiy**: foydalanuvchi
143 qatorlik faylni ko'r-ko'rona yuklamasligi kerak. Avval preview, keyin commit.

Import **idempotent**: bir davr qayta yuklansa dublikat bo'lmaydi, yozuvlar
yangilanadi (`upsert` + `@@unique([tpPointId, period])`).

Fider nomlari `Feeder.aliases` orqali moslanadi — kelayotgan fayllarda nom
kirillcha yoki boshqa imloda bo'lishi mumkin. **Tizimning o'zi to'liq
o'zbek lotinida**; aliaslar faqat import uchun.

## Stack

| Texnologiya | Versiya | Diqqat |
|---|---|---|
| Next.js | 16 (App Router, Turbopack) | Yuqoridagi ogohlantirishga qara |
| React | 19 | |
| Tailwind CSS | **v4** | `tailwind.config.js` YO'Q — sozlash `app/globals.css` ichida |
| Prisma | **7** | Driver adapter majburiy; v6 qo'llanmalariga ergashma |
| PostgreSQL | 18 | Postgres.app, lokal |
| ExcelJS | 4 | `.xlsx` o'qish |

## Prisma 7 qoidalari

- Client `app/generated/prisma/` ga generate qilinadi. Import:
  `@/app/generated/prisma/client`.
- **Hech qachon** `new PrismaClient()` yozma — faqat `import { prisma } from "@/lib/prisma"`.
- Prisma so'rovlari faqat Server Component / Server Action / Route Handler ichida.
- Schema o'zgargach: `npm run db:migrate`. **Non-interaktiv muhitda**
  `migrate dev` ishlamaydi — migration'ni qo'lda yasa:
  ```
  npx prisma migrate diff --from-config-datasource --to-schema ./prisma/schema.prisma --script \
    > prisma/migrations/<timestamp>_<nom>/migration.sql
  npx prisma migrate deploy
  ```
- **`prisma migrate reset` — foydalanuvchi ruxsatisiz ishlatilmaydi.**
  Prisma buni o'zi bloklaydi va bu to'g'ri: baza butunlay tozalanadi.

### Seed fayllari

| Fayl | Nima qiladi |
|---|---|
| `prisma/seed.ts` | Faqat **tuzilma**: ETK → podstansiya → 2 ввод → 11 fider (haqiqiy koeffitsientlar) |
| `prisma/seed-feeder-readings.ts` | `umumiy_hisobot.xlsx` dagi haqiqiy fider ko'rsatkichlari (iyul/avgust 2026) |

TP'lar va ularning o'lchovlari seed'da yo'q — ular Excel import orqali kiradi.

## Layout arxitekturasi

```
┌─ Page (app/layout.tsx → AppShell) ───────────────────┐
│ ┌─────────┐ ┌────────────────────────────────────┐   │
│ │ Sidebar │ │ Header                             │   │
│ │         │ ├────────────────────────────────────┤   │
│ │         │ │ Main panel ← {children} = page.tsx │   │
│ └─────────┘ └────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

- Sahifa hech qachon scroll bo'lmaydi (`h-dvh`); scroll **faqat main panel** ichida.
- `page.tsx` fayllari **faqat main panel kontentini** qaytaradi — sidebar,
  header, `<html>`, `<body>` yoki sahifa foni emas.
- `page.tsx` ildizi odatda `<div className="flex flex-col gap-3">`.
- Shell o'zgarishi — faqat `app/layout.tsx` va `components/layout/`.

## Navigatsiya

`components/layout/nav.ts` — yagona manba. Sidebar ham, Header sarlavhasi ham
shundan o'qiladi.

**QOIDA:** ro'yxatda faqat haqiqatda mavjud sahifalar bo'lsin — har bir `href`
uchun `app/<href>/page.tsx` bor bo'lishi shart, aks holda 404.

## Zichlik (spacing)

Interfeys **ixcham**:

| Joy | Qiymat |
|---|---|
| Panellar orasi va tashqi padding | `gap-1.5` / `p-1.5` |
| Panel/karta ichidagi padding | `p-3` |
| Blok elementlar orasi | `gap-2` — `gap-3` |
| Burchaklar | `rounded-xl` (panel), `rounded-lg` (ichki) |
| Ikonka | `size-3.5` / `size-4` |
| Jadval katagi | `px-2.5 py-1.5` |

`p-5`, `p-6`, `gap-6`, `h-16` ishlatilmaydi.

## Rang rejimi (light / dark / system)

Dark mode **`prefers-color-scheme` orqali EMAS** — `<html>` dagi `.dark` class'i bilan:

- `app/globals.css`: `@custom-variant dark (&:where(.dark, .dark *));`
- `lib/theme.ts`: holat mantiqi + `themeInitScript` (`<head>` da, React'dan
  oldin ishlaydi — FOUC bo'lmasligi uchun).
- `components/layout/theme-toggle.tsx`: `useSyncExternalStore` bilan o'qiydi.
  Effect + `setState` **ishlatilmaydi** — ESLint `react-hooks/set-state-in-effect`
  buni taqiqlaydi.

Har bir yangi komponentda `dark:` variantlarini ham yoz.

## Grafiklar

Tashqi grafik kutubxonasi YO'Q — barcha vizualizatsiya oddiy HTML/CSS bilan,
server tomonda render qilinadi (`components/dashboard/bar-list.tsx`).

Ranglar `app/globals.css` dagi `.viz` blokida CSS o'zgaruvchisi sifatida:

| Rol | Light | Dark | Qayerda |
|---|---|---|---|
| `--series-1` | `#2a78d6` | `#3987e5` | 1-seriya (kategorik) |
| `--series-2` | `#eb6834` | `#d95926` | 2-seriya |
| `--status-good` | `#0ca30c` | — | elektr oqimi |
| `--status-warning` | `#fab219` | — | texnologik yo'qotish |
| `--status-critical` | `#d03b3b` | — | tijoriy yo'qotish |

Qoidalar (dataviz skill'dan, validatordan o'tkazilgan):

1. **Rangni ko'z bilan tanlama** — `dataviz` skill'ining
   `scripts/validate_palette.js` ni ishga tushir. Seriya 1↔2 juftligi ikkala
   rejimda ham barcha tekshiruvdan o'tadi (CVD ΔE 24.7, oddiy ko'rish 33.6).
   Semantik "aqua/sariq/qizil" varianti sinab ko'rilgan va **dark rejimda
   yiqilgan** (sariq↔qizil ΔE 13.0 < 15) — qaytarma.
2. **Rang yolg'iz ma'no tashimasin** — har bir segment yonida yorliq va son
   matn sifatida yozilgan bo'lsin.
3. **Status ranglari zaxiralangan** — ular hech qachon "seriya 3" sifatida
   ishlatilmaydi va doim yorliq bilan keladi.
4. **Grafik butunni ko'rsatsa, qismlar butunni bersin.** Dashboard'dagi
   "Energiya taqsimoti" faqat oqimi O'LCHANGAN fiderlar ustida quriladi —
   aks holda TP'siz fiderlar tufayli foizlar 100% ga yetmaydi va grafik
   yolg'on gapiradi. O'lchanmagan qism izohda alohida aytiladi.

## Boshqaruv paneli

`app/page.tsx` — yuqorida `Umumiy | <fider nomlari>` tablari
(`components/dashboard/feeder-tabs.tsx`). Tanlov URL'da: `/?feeder=<id>`.
`<button>` emas, `<Link>` — havola ulashilsa ham o'sha fider ochiladi.

`Umumiy` da barcha fiderlar yig'indisi, fider tanlansa — o'sha fider va uning
TP'lari kesimi.

## Ehtiyot bo'lish kerak

- **`npm run build` ni `npm run dev` ishlab turganda ishga tushirma.** Ikkalasi
  ham `.next/` dan foydalanadi; build Turbopack keshini qayta yozadi va dev
  server "Unable to open static sorted file … .sst" xatosi bilan qulaydi.
  Avval dev'ni to'xtat, keyin build qil.
- **Schema o'zgargach dev serverni qayta ishga tushir.** Prisma client
  `globalThis` da saqlanadi va hot-reload'da eski nusxa qolib ketadi — yangi
  maydonlar `undefined` bo'lib ko'rinadi.

## Konventsiyalar

- Interfeys tili — **o'zbek lotin**. Kod (o'zgaruvchi, funksiya, fayl) — inglizcha.
- Yo'l aliasi: `@/*` → loyiha ildizi.
- Ikonkalar: `lucide-react`. Ranglar: `zinc` shkalasi, urg'u `amber`.
- Formatlash — `lib/format.ts`. Komponent ichida `Intl.NumberFormat` yaratma.
- UI primitivlari — `components/ui/index.tsx`.
- Server Action formalari — `components/action-form.tsx` (`ActionForm`,
  `SubmitButton`, `DeleteButton`). O'chirish **doim** tasdiq so'raydi.
- **Ehtiyot:** `"use client"` modulidan oddiy funksiya eksport qilib, uni
  server komponentida chaqirib bo'lmaydi. Umumiy yordamchilar `lib/` da tursin.
