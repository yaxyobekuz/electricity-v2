"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui";

type State = { status: "idle" | "success" | "error"; message?: string };

const initialState: State = { status: "idle" };

/**
 * Server Action bilan ishlaydigan forma.
 *
 * Natija (xato/muvaffaqiyat) forma ostida ko'rsatiladi — foydalanuvchi
 * saqlash muvaffaqiyatli bo'ldimi yoki yo'qmi ko'rib turishi kerak.
 * `children` server komponentida render qilinadi va shu yerga uzatiladi.
 */
export function ActionForm({
  action,
  children,
  className = "",
}: {
  action: (prev: State, formData: FormData) => Promise<State>;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className={className}>
      {children}

      {state.status === "error" && (
        <p className="text-xs text-red-600 dark:text-red-400">{state.message}</p>
      )}
      {state.status === "success" && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400">
          {state.message}
        </p>
      )}
    </form>
  );
}

/** Yuborish tugmasi — forma yuborilayotganda o'zi bloklanadi. */
export function SubmitButton({
  children,
  tone = "primary",
}: {
  children: React.ReactNode;
  tone?: "primary" | "secondary" | "danger";
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" tone={tone} disabled={pending}>
      {pending ? "..." : children}
    </Button>
  );
}

/**
 * O'chirish tugmasi — bosilganda tasdiq so'raydi.
 * Tasodifan bosilganda ma'lumot yo'qolib ketmasligi uchun.
 */
export function DeleteButton({
  action,
  id,
  label = "O'chirish",
  confirmText,
}: {
  action: (formData: FormData) => void;
  id: string;
  label?: string;
  confirmText: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(confirmText)) event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <SubmitButton tone="danger">{label}</SubmitButton>
    </form>
  );
}
