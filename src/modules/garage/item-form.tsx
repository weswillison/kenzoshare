import { ActionForm, Submit } from "@/components/action-form";
import { Field, Input, Select, Textarea } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { t } from "@/strings/en";
import { saveItem } from "./actions";
import { PhotoInput } from "./photo-input";
import type { Database } from "@/lib/database.types";

type Item = Database["public"]["Tables"]["garage_items"]["Row"];

export async function ItemForm({ item }: { item?: Item }) {
  const supabase = await createClient();
  const { data: categories } = await supabase.from("garage_categories").select("id, name").order("sort");
  const id = item?.id ?? crypto.randomUUID();

  return (
    <ActionForm action={saveItem}>
      <input type="hidden" name="id" value={id} />
      {item && <input type="hidden" name="existing" value="1" />}
      <Field label={t.garage.name}>
        <Input name="name" defaultValue={item?.name} required />
      </Field>
      <Field label={t.garage.category}>
        <Select name="category_id" defaultValue={item?.category_id ?? categories?.[0]?.id} required>
          {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </Field>
      <Field label={t.garage.replacementCost}>
        <Input
          name="cost"
          inputMode="decimal"
          placeholder="$"
          defaultValue={item ? (item.replacement_cost_cents / 100).toString() : ""}
          required
        />
      </Field>
      <PhotoInput name="photo_path" folder={`item/${id}`} label={t.garage.photo} defaultPath={item?.photo_path} />
      <Field label={t.garage.comesWith} hint={t.garage.comesWithHint}>
        <Input name="comes_with" defaultValue={item?.comes_with ?? ""} />
      </Field>
      <Field label={t.garage.condition}>
        <Input name="condition" defaultValue={item?.condition ?? ""} />
      </Field>
      <Field label={t.garage.location} hint={t.garage.locationHint}>
        <Input name="location" defaultValue={item?.location ?? ""} />
      </Field>
      <Field label={t.garage.notes}>
        <Textarea name="notes" defaultValue={item?.notes ?? ""} />
      </Field>
      <Submit>{t.garage.save}</Submit>
    </ActionForm>
  );
}
