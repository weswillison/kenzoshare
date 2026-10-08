"use client";

import { useId, useState, type ReactNode } from "react";
import { t } from "@/strings/en";

// A heading row whose ⓘ opens its explanation right below it.
export function Heading({ level, title, info, action }: {
  level: 1 | 2;
  title: string;
  info?: ReactNode;
  action?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const H = level === 1 ? "h1" : "h2";

  return (
    <>
      <div className={level === 1 ? "flex items-center gap-2 pt-6 pb-3" : "flex items-center gap-2 border-b border-line pb-1"}>
        <H className={level === 1 ? "text-xl font-semibold" : "font-semibold"}>{title}</H>
        {info && (
          <button
            type="button"
            aria-label={t.moreInfo}
            aria-expanded={open}
            aria-controls={id}
            onClick={() => setOpen((o) => !o)}
            className={`inline-flex size-6 items-center justify-center rounded-full border text-xs ${
              open ? "border-fg text-fg" : "border-line text-muted"
            }`}
          >
            i
          </button>
        )}
        <div className="ml-auto">{action}</div>
      </div>
      {info && (
        <p id={id} hidden={!open} className="pb-3 text-muted">
          {info}
        </p>
      )}
    </>
  );
}
