"use client";

import { useActionState, useRef, useState } from "react";
import { CheckCircle2, FileSpreadsheet, Upload } from "lucide-react";

import { importExcelAction } from "./actions";
import type { ImportState } from "./actions";
import { formatNumber } from "@/lib/format";
import { formatPeriod } from "@/lib/format";
import {
  Badge,
  Button,
  Field,
  Input,
  Notice,
  Table,
  Td,
  Th,
  Tr,
} from "@/components/ui";

const initialState: ImportState = { status: "idle" };

export function ImportForm() {
  const [state, formAction, isPending] = useActionState(
    importExcelAction,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const summary = state.summary;
  const canCommit = state.status === "preview" && summary && summary.skipped < summary.totalRows;

  return (
    <div className="flex flex-col gap-3">
      <form ref={formRef} action={formAction} className="flex flex-col gap-3">
        <div className="grid gap-2 sm:grid-cols-3">
          <Field label="Excel fayl (.xlsx)" hint="To'liq hisobot shabloni">
            <input
              type="file"
              name="file"
              accept=".xlsx"
              required
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
              className="h-8 w-full rounded-lg border border-zinc-200 bg-white text-sm file:mr-2 file:h-full file:cursor-pointer file:rounded-l-lg file:border-0 file:bg-zinc-100 file:px-2 file:text-sm dark:border-zinc-800 dark:bg-zinc-950 dark:file:bg-zinc-800"
            />
          </Field>

          <Field
            label="Varaq nomi"
            hint={
              state.sheets?.length
                ? `Fayldagilar: ${state.sheets.join(", ")}`
                : "Bo'sh qoldirilsa — birinchi varaq"
            }
          >
            <Input name="sheet" placeholder="0108" />
          </Field>

          <Field
            label="Hisobot davri"
            hint="Bo'sh qoldirilsa fayl sarlavhasidan olinadi"
          >
            <Input type="month" name="period" />
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" name="mode" value="preview" disabled={isPending}>
            <FileSpreadsheet className="size-4" />
            {isPending ? "Tekshirilmoqda..." : "Tekshirish"}
          </Button>

          {canCommit && (
            <Button
              type="submit"
              name="mode"
              value="commit"
              tone="secondary"
              disabled={isPending}
            >
              <Upload className="size-4" />
              Bazaga yuklash
            </Button>
          )}

          {fileName && (
            <span className="text-xs text-zinc-500">{fileName}</span>
          )}
        </div>
      </form>

      {state.status === "error" && (
        <Notice tone="danger" title="Import bajarilmadi">
          {state.message}
        </Notice>
      )}

      {state.message && state.status !== "error" && (
        <Notice tone="warning" title="Faylga oid eslatma">
          {state.message}
        </Notice>
      )}

      {summary && (
        <>
          {state.status === "done" ? (
            <Notice tone="success" title="Bazaga yozildi">
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="size-4" />
                {formatPeriod(new Date(summary.period))} — {summary.created} ta
                yangi, {summary.updated} ta yangilandi.
              </span>
            </Notice>
          ) : (
            <Notice tone="info" title="Tekshiruv natijasi (hali yozilmadi)">
              {formatPeriod(new Date(summary.period))} davri uchun{" "}
              {summary.totalRows} qator o&apos;qildi. Yozilganda:{" "}
              {summary.created} ta yangi, {summary.updated} ta yangilanadi
              {summary.skipped > 0 && `, ${summary.skipped} ta o'tkazib yuboriladi`}
              .
            </Notice>
          )}

          {summary.unknownFeeders.length > 0 && (
            <Notice tone="warning" title="Bazada topilmagan fiderlar">
              {summary.unknownFeeders.join(", ")} — bu nomlar bazadagi biror
              fiderga mos kelmadi. Tarmoq tuzilmasi bo&apos;limida fider
              qo&apos;shing yoki mavjud fiderga shu nomni muqobil nom sifatida
              kiriting.
            </Notice>
          )}

          <ImportOutcomes summary={summary} />
        </>
      )}
    </div>
  );
}

function ImportOutcomes({ summary }: { summary: NonNullable<ImportState["summary"]> }) {
  // Diqqat talab qiladigan qatorlar tepada tursin.
  const flagged = summary.outcomes.filter((o) => o.status === "skip" || o.message || o.mismatch);
  const shown = flagged.length > 0 ? flagged : summary.outcomes.slice(0, 20);

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs text-zinc-500">
        {flagged.length > 0
          ? `E'tibor talab qiladigan ${flagged.length} ta qator:`
          : `Barcha qatorlar muammosiz. Birinchi ${shown.length} tasi:`}
      </p>

      <Table>
        <thead>
          <tr>
            <Th>Qator</Th>
            <Th>TP</Th>
            <Th>Fider</Th>
            <Th>Holat</Th>
            <Th align="right">Farq</Th>
            <Th align="right">Iste&apos;mol</Th>
            <Th>Izoh</Th>
          </tr>
        </thead>
        <tbody>
          {shown.map((o) => (
            <Tr key={`${o.excelRow}-${o.tpNumber}`}>
              <Td muted numeric>
                {o.excelRow}
              </Td>
              <Td strong>{o.tpNumber}</Td>
              <Td muted>{o.feederName}</Td>
              <Td>
                <Badge
                  tone={
                    o.status === "create"
                      ? "success"
                      : o.status === "update"
                        ? "info"
                        : "danger"
                  }
                >
                  {o.status === "create"
                    ? "yangi"
                    : o.status === "update"
                      ? "yangilanadi"
                      : "o'tkazildi"}
                </Badge>
              </Td>
              <Td align="right" numeric>
                {formatNumber(o.difference)}
              </Td>
              <Td align="right" numeric>
                {formatNumber(o.consumedKwh)}
              </Td>
              <Td muted>
                {[o.message, o.mismatch].filter(Boolean).join(" · ") || "—"}
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
