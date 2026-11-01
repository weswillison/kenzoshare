"use client";

import { useState } from "react";
import { Field, Input, Select } from "@/components/ui";
import { t } from "@/strings/en";

export function PauseFields() {
  const [duration, setDuration] = useState("open");

  return (
    <>
      <Field label={t.garage.pauseFor}>
        <Select name="for" value={duration} onChange={(e) => setDuration(e.target.value)}>
          <option value="open">{t.garage.pauseOpen}</option>
          <option value="week">{t.garage.pauseWeek}</option>
          <option value="month">{t.garage.pauseMonth}</option>
          <option value="date">{t.garage.pauseUntil}</option>
        </Select>
      </Field>
      {duration === "date" && (
        <Field label={t.garage.pauseUntil}>
          <Input name="until" type="date" required />
        </Field>
      )}
    </>
  );
}
