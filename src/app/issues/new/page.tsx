import { ActionForm, Submit } from "@/components/action-form";
import { Field, Page, Select, Textarea } from "@/components/ui";
import { reportIssue } from "@/modules/core/actions";
import { requireMember } from "@/modules/core/me";
import { createClient } from "@/lib/supabase/server";
import { t } from "@/strings/en";

export default async function NewIssuePage({ searchParams }: PageProps<"/issues/new">) {
  const me = await requireMember();
  const { about, item } = await searchParams;
  const itemId = typeof item === "string" ? item : "";
  const supabase = await createClient();
  const { data: linked } = itemId
    ? await supabase.from("garage_items").select("id, name").eq("id", itemId).maybeSingle()
    : { data: null };
  const { data: people } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("status", "active")
    .neq("id", me.id)
    .neq("display_name", "")
    .order("display_name");

  return (
    <Page title={t.issues.new} info={t.issues.info}>
      <ActionForm action={reportIssue}>
        {linked && (
          <>
            <input type="hidden" name="item" value={linked.id} />
            <p className="pt-2">{linked.name}</p>
          </>
        )}
        <Field label={t.issues.about}>
          <Select name="about" defaultValue={typeof about === "string" ? about : ""}>
            <option value="">{t.issues.nobody}</option>
            {people?.map((p) => <option key={p.id} value={p.id}>{p.display_name}</option>)}
          </Select>
        </Field>
        <Field label={t.issues.kind}>
          <Select name="kind" required defaultValue="">
            <option value="" disabled>—</option>
            {Object.entries(t.issues.kinds).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
        </Field>
        <Field label={t.issues.description}>
          <Textarea name="description" required />
        </Field>
        <Submit>{t.issues.submit}</Submit>
      </ActionForm>
    </Page>
  );
}
