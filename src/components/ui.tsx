import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { t } from "@/strings/en";
import { Heading } from "./heading";

export function Page({ title, info, action, children }: {
  title?: string;
  info?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-16">
      {title && <Heading level={1} title={title} info={info} action={action} />}
      {children}
    </main>
  );
}

export function Section({ title, info, action, children }: {
  title: string;
  info?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="pt-6">
      <Heading level={2} title={title} info={info} action={action} />
      {children}
    </section>
  );
}

export function Row({ href, testId, children }: { href?: string; testId?: string; children: ReactNode }) {
  const cls = "flex min-h-12 items-center gap-3 border-b border-line py-2";
  return href ? (
    <Link href={href} data-testid={testId} className={`${cls} hover:bg-hover`}>{children}</Link>
  ) : (
    <div data-testid={testId} className={cls}>{children}</div>
  );
}

export function Muted({ children }: { children: ReactNode }) {
  return <span className="text-muted">{children}</span>;
}

export function Empty() {
  return <p className="py-3 text-muted">{t.none}</p>;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block pt-4">
      <span className="block pb-1 font-medium">{label}</span>
      {children}
      {hint && <span className="block pt-1 text-sm text-muted">{hint}</span>}
    </label>
  );
}

const inputCls = "w-full rounded border border-line bg-bg px-3 py-2 text-base";

export function Input(props: ComponentProps<"input">) {
  return <input {...props} className={inputCls} />;
}

export function Textarea(props: ComponentProps<"textarea">) {
  return <textarea rows={3} {...props} className={inputCls} />;
}

export function Select(props: ComponentProps<"select">) {
  return <select {...props} className={inputCls} />;
}

export function TextLink(props: ComponentProps<typeof Link>) {
  return <Link {...props} className="text-link underline-offset-2 hover:underline" />;
}
