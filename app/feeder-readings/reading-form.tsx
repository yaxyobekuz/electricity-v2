"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";

import { saveFeederReading } from "./actions";
import type { ReadingFormState } from "./actions";
import { Button, Field, Input, Notice, Select } from "@/components/ui";

const initialState: ReadingFormState = { status: "idle" };

export function FeederReadingForm({
  feeders,
  defaultPeriod,
}: {
  feeders: { id: string; name: string; coefficient: number }[];
  defaultPeriod: string;
}) {
  const [state, formAction, isPending] = useActionState(
    saveFeederReading,
    initialState,
  );

  return (
    <div className="flex flex-col gap-2">
      <form action={formAction} className="grid gap-2 sm:grid-cols-5">
        <Field label="Fider">
          <Select name="feederId" required defaultValue="">
            <option value="" disabled>
              Tanlang
            </option>
            {feeders.map((feeder) => (
              <option key={feeder.id} value={feeder.id}>
                {feeder.name} (koef. {feeder.coefficient})
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Davr">
          <Input type="month" name="period" defaultValue={defaultPeriod} required />
        </Field>

        <Field label="Joriy ko'rsatkich" hint="Oldingisi avtomatik olinadi">
          <Input
            name="meterValue"
            inputMode="decimal"
            placeholder="28325"
            required
          />
        </Field>

        <Field label="Texnologik yo'qotish, %">
          <Input
            name="technicalLossPercent"
            inputMode="decimal"
            defaultValue="12"
          />
        </Field>

        <Field label="Izoh">
          <Input name="note" placeholder="ixtiyoriy" />
        </Field>

        <div className="sm:col-span-5">
          <Button type="submit" disabled={isPending}>
            <Save className="size-4" />
            {isPending ? "Saqlanmoqda..." : "Saqlash"}
          </Button>
        </div>
      </form>

      {state.status === "error" && (
        <Notice tone="danger">{state.message}</Notice>
      )}

      {state.status === "success" && (
        <Notice tone="success" title={state.message}>
          {state.warnings && state.warnings.length > 0 ? (
            <ul className="list-inside list-disc">
              {state.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          ) : (
            "Hisobot yangilandi."
          )}
        </Notice>
      )}
    </div>
  );
}
