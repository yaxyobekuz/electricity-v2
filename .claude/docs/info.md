Rasm va xodimingiz aytgan gap **100% to'g'ri** va juda mantiqiy!

Rasmdagi jadval podstansiya va undan chiquvchi fiderlar o'rtasidagi ierarxiyani xuddi siz va xodimingiz tushuntirgandek aniq ko'rsatib turibdi.

Keling, ushbu jadvalni ma'lumotlar bazangiz (Database) va dasturingiz mantiqiga o'tkazib tahlil qilamiz.

---

## 1. Jadval va Zanjir tahlili

Xodimingiz aytgan zanjir jadvalda quyidagicha aks etgan:

```text
[Подстанция: НИМ станция Чинобод 110/35/10 кВ]
                         │
        ┌────────────────┴────────────────┐
        ▼                                 ▼
[ВВОД Т1 25 000 кВА]             [ВВОД Т2 40 000 кВА]
        │                                 │
   (5 ta Fider)                      (6 ta Fider)
   * ЧПЗ                             * Жўжахона
   * Бўзчи                           * Қияли
   * Парранда                        * Камолий
   * Тўмор                           * Ташлама
   * Қўрғонгаз                       * Тола
                                     * Ҳакулобод
        │                                 │
        └────────────────┬────────────────┘
                         ▼
             [TP - Transformatorlar]
                         │
                         ▼
                  [Uy / Aholi / Avariya]

```

### Jadvaldagi asosiy tushunchalar:

1. **Подстанция (НИМ станция Чинобод 110/35/10 кВ):** Bu podstansiyaga 110 kV yuqori kuchlanish kiradi va u 35 kV hamda 10 kV o'rta kuchlanishga bo'linib beriladi.
2. **Ввод Т1 va Ввод Т2 (Kuch transformatorlari):** Podstansiya ichidagi asosiy "yurak".
* **Т1** (quvvati 25 000 kVA) — 5 ta fiderga elektr beradi.
* **Т2** (quvvati 40 000 kVA — xodimingiz aytgan 40k shu!) — 6 ta fiderga elektr beradi.


3. **10 кВ Фидерлар:** Har bir Ввод (Т1 va Т2) dan bir nechta 10 kilovoltli liniyalar (fiderlar) ajralib chiqadi.
4. **Hisoblagich ko'rsatkichi, Koeffitsient va Oqib o'tgan elektr (kVt/soat):**
* *Farqi:* `01.08.2026` ko'rsatkichidan `01.07.2026` ko'rsatkichi ayirilgan.
* *Koeffitsient:* Yuqori tok va kuchlanishni o'lchash uchun hisoblagich va liniya orasiga **Tok Transformatori (TT)** qo'yiladi. Masalan, "Жўжахона" fiderida farq **144** chiqqan, koeffitsient **3000** ga ko'paytirilib, bir oyda **432 000 kVt/s** elektr o'tgani aniqlangan.



---

## 2. Dasturingiz (Database) uchun schema modeli

Ushbu hisobotdan kelib chiqib, **Relational Database (PostgreSQL/MySQL)** uchun jadvallaringiz tuzilmasini quyidagicha loyihalashtirishingiz kerak:

### 1-Jadval: `substations` (Podstansiyalar)

* `id`
* `name` ("НИМ станция Чинобод 110/35/10 кВ")
* `voltage_type` ("110/35/10")

### 2-Jadval: `transformers` / `vvods` (Podstansiya ichidagi Ввод-Transformatorlar)

* `id`
* `substation_id` (Foreign Key -> `substations.id`)
* `name` ("ВВОД Т1 25 000 кВА" yoki "ВВОД Т2 40 000 кВА")
* `capacity_kva` (25000 / 40000)

### 3-Jadval: `feeders` (Fiderlar - 10 kV)

* `id`
* `transformer_id` (Foreign Key -> `transformers.id`)
* `name` ("Жўжахона", "Бўзчи", "Камолий" va h.k.)
* `voltage` (10)
* `ct_ratio` / `coefficient` (3000, 4000, 6000 va h.k.)

### 4-Jadval: `feeder_readings` (Fiderlar oylik ko'rsatkichi)

* `id`
* `feeder_id` (Foreign Key -> `feeders.id`)
* `date` ("2026-08-01")
* `meter_value` (28325)
* `consumed_kwh` (432000)

### 5-Jadval: `tp_points` (Transformator punktlari - Mahallalardagi)

* `id`
* `feeder_id` (Foreign Key -> `feeders.id`) — *chunki har bir TP qaysidir fiderga ulangan bo'ladi!*
* `tp_number` ("TP-123")
* `address`

---

## Modellashtirishdagi muhim qoida:

E'tibor bering, **ВВОД (Т1, Т2)** bu podstansiyaning **ichidagi** katta transformator, **TP** esa mahallalardagi **tashqarida (ko'chada)** joylashgan kichik transformatorlar.

Dasturiy ierarxiyangiz aynan shunday ketadi:


$$\text{Podstansiya} \longrightarrow \text{Ввод (Т1/Т2)} \longrightarrow \text{Fider} \longrightarrow \text{TP (Transformator)} \longrightarrow \text{Abonent}$$