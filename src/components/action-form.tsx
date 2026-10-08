"use client";

import { useActionState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/modules/core/actions";

export function ActionForm({ action, children }: {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  children: ReactNode;
}) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction}>
      {children}
      {state?.error && <p role="alert" className="pt-3 text-danger">{state.error}</p>}
      {state?.ok && <p role="status" className="pt-3">{state.ok}</p>}
    </form>
  );
}

export function Submit({ children, quiet }: { children: ReactNode; quiet?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={
        quiet
          ? "min-h-11 px-2 whitespace-nowrap text-link disabled:opacity-50"
          : "mt-5 min-h-11 w-full rounded bg-link px-4 font-medium text-on-link disabled:opacity-50 sm:w-auto"
      }
    >
      {children}
    </button>
  );
}
