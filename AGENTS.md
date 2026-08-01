<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Electricity — loyiha qoidalari

Elektr energiyasi iste'moli hisobi va boshqaruvi tizimi.

## Stack

| Texnologiya | Versiya | Diqqat |
|---|---|---|
| Next.js | 16 (App Router, Turbopack) | Yuqoridagi ogohlantirishga qara |
| React | 19 | |
| Tailwind CSS | **v4** | `tailwind.config.js` YO'Q — konfiguratsiya `app/globals.css` ichida `@theme` orqali |
| Prisma | **7** | v6'dan jiddiy farq qiladi — pastga qara |
| PostgreSQL | — | |

## Prisma 7 qoidalari

Prisma 7 Rust query engine o'rniga **Query Compiler** ishlatadi va **driver adapter majburiy**.
Internetdagi Prisma qo'llanmalarining aksariyati v6 uchun — ularga ergashma.

- Client `app/generated/prisma/` ga generate qilinadi (gitignore'da). Import: `@/app/generated/prisma/client`.
- **Hech qachon** komponent yoki route ichida `new PrismaClient()` yozma. Faqat singleton'dan foydalan:
  ```ts
  import { prisma } from "@/lib/prisma";
  ```
- Schema o'zgargach: `npm run db:migrate` (dev) yoki `npm run db:push` (tez prototip).
- Konfiguratsiya `prisma.config.ts` ichida (v7 yangiligi), `DATABASE_URL` esa `.env` da.
- Prisma so'rovlari faqat Server Component / Server Action / Route Handler ichida. Client component'ga (`"use client"`) hech qachon import qilinmaydi.

## Layout arxitekturasi

Butun tizim bitta doimiy "shell" ichida ishlaydi. U `app/layout.tsx` da qurilgan:

```
┌─ Page (app/layout.tsx) ──────────────────────────────┐
│ ┌─────────┐ ┌────────────────────────────────────┐   │
│ │         │ │ Header                             │   │
│ │ Sidebar │ ├────────────────────────────────────┤   │
│ │         │ │                                    │   │
│ │         │ │ Main panel  ← {children} = page.tsx│   │
│ │         │ │                                    │   │
│ └─────────┘ └────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

- **Page** — `h-dvh`, `p-3`, panellar orasida `gap-3`. Sahifa hech qachon scroll bo'lmaydi.
- **Sidebar** — chapda, to'liq balandlik, qat'iy kenglik (`w-64`). `md:` dan kichik ekranda yashiriladi.
- **Header** — o'ng ustunning tepasida, qat'iy balandlik (`h-16`). Sarlavhani `pathname` dan avtomatik oladi.
- **Main panel** — qolgan joyni egallaydi, **scroll faqat shu yerda** (`overflow-y-auto`).

Qoidalar:

1. `page.tsx` fayllari **faqat main panel ichidagi kontentni** qaytaradi. Ular o'zida sidebar, header, `<html>`, `<body>` yoki sahifa fonini qaytarmaydi.
2. `page.tsx` ildizi odatda `<div className="flex flex-col gap-6">` — tashqi padding'ni main panel o'zi beradi.
3. Shell'ni o'zgartirish kerak bo'lsa — `app/layout.tsx` va `components/layout/`. Boshqa joyda dublikat qilinmaydi.

## Navigatsiya

`components/layout/nav.ts` — **yagona manba**. Sidebar ro'yxati ham, Header sarlavhasi ham shundan o'qiladi.

Yangi bo'lim qo'shish:
1. `navItems` ga yozuv qo'sh (label, href, lucide ikonka).
2. `app/<href>/page.tsx` yarat.

Sidebar/Header'ni qo'lda tahrirlash shart emas — ular avtomatik yangilanadi.

## Konventsiyalar

- Interfeys tili — **o'zbekcha**. Kod (o'zgaruvchi, funksiya, fayl nomlari) — inglizcha.
- Yo'l aliasi: `@/*` → loyiha ildizi.
- Ikonkalar: `lucide-react`.
- Ranglar: `zinc` shkalasi, urg'u rangi `amber`. Dark mode `prefers-color-scheme` orqali — har bir yangi komponentda `dark:` variantlarini ham yoz.
- Umumiy komponentlar `components/` da, shell qismlari `components/layout/` da.
