import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { t } from "@/strings/en";

// Uses the browser's built-in popover: no JavaScript, closes on tap outside.
export function Info({ id, children }: { id: string; children: ReactNode }) {
  return (
    <>
      <button
        type="button"
        popoverTarget={id}
        aria-label={t.moreInfo}
        className="inline-flex size-6 items-center justify-center rounded-full border border-line text-xs text-muted"
      >
        i
      </button>
      <div
        id={id}
        popover="auto"
        className="m-auto w-[calc(100%-2rem)] max-w-sm rounded border border-line bg-bg p-4 text-fg shadow-lg backdrop:bg-black/20"
      >
        {children}
      </div>
    </>
  );
}

export function Page({ title, info, action, children }: {
  title?: string;
  info?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-16">
      {title && (
        <div className="flex items-center gap-2 pt-6 pb-3">
          <h1 className="text-xl font-semibold">{title}</h1>
          {info && <Info id="page-info">{info}</Info>}
          <div className="ml-auto">{action}</div>
        </div>
      )}
      {children}
    </main>
  );
}

export function Section({ title, info, infoId, action, children }: {
  title: string;
  info?: ReactNode;
  infoId?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="pt-6">
      <div className="flex items-center gap-2 border-b border-line pb-1">
        <h2 className="font-semibold">{title}</h2>
        {info && <Info id={infoId ?? `info-${title}`}>{info}</Info>}
        <div className="ml-auto">{action}</div>
      </div>
      {children}
    </section>
  );
}

export function Row({ href, children }: { href?: string; children: ReactNode }) {
  const cls = "flex min-h-12 items-center gap-3 border-b border-line py-2";
  return href ? (
    <Link href={href} className={`${cls} hover:bg-hover`}>{children}</Link>
  ) : (
    <div className={cls}>{children}</div>
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
