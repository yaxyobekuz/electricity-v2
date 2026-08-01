import { Notice, PageHeading } from "@/components/ui";
import { ImportForm } from "./import-form";

export const metadata = { title: "Excel import — Electricity" };

export default function ImportPage() {
  return (
    <div className="flex flex-col gap-3">
      <PageHeading
        title="Excel import"
        description="To'liq hisobot shablonini yuklab, TP ko'rsatkichlarini tizimga kiriting."
      />

      <Notice tone="info" title="Qanday ishlaydi">
        Avval <b>Tekshirish</b> tugmasi bosiladi — fayl o&apos;qiladi, hisob-kitob
        qilinadi va natija ko&apos;rsatiladi, lekin bazaga <b>hech narsa
        yozilmaydi</b>. Natija to&apos;g&apos;ri bo&apos;lsa,{" "}
        <b>Bazaga yuklash</b> bosiladi. Bir davr uchun qayta yuklansa,
        ma&apos;lumot dublikat bo&apos;lmaydi — mavjud yozuvlar yangilanadi.
      </Notice>

      <ImportForm />

      <Notice tone="warning" title="Fayl talablari">
        Ustunlar sarlavha matni bo&apos;yicha topiladi, shuning uchun ustunlar
        joyi o&apos;zgarsa ham import ishlaydi. Sarlavhada quyidagilar
        bo&apos;lishi kerak: <code>TP nomer</code>, <code>Fiderlar nomi</code>,{" "}
        <code>koeffitsienti</code> va ikkita ko&apos;rsatkich ustuni — ular
        sarlavhasida sana bo&apos;lsin (masalan{" "}
        <code>01.08.2026 kungi ko&apos;rsatkichi</code>). Fider nomi bazadagi
        nom yoki uning muqobil nomlaridan biriga mos kelishi kerak.
      </Notice>
    </div>
  );
}
