import { notFound } from "next/navigation";
import { ActionForm, Submit } from "@/components/action-form";
import { Field, Input, Page, Row, Section, Textarea } from "@/components/ui";
import { saveHousehold } from "@/modules/core/actions";
import { requireMember } from "@/modules/core/me";
import { createClient } from "@/lib/supabase/server";
import { t } from "@/strings/en";

export default async function HouseholdPage({ params }: PageProps<"/households/[id]">) {
  const me = await requireMember();
  const { id } = await params;
  const supabase = await createClient();
  const { data: h } = await supabase
    .from("households")
    .select("*, profiles(id, display_name)")
    .eq("id", id)
    .maybeSingle();
  if (!h) notFound();

  return (
    <Page title={h.name}>
      {h.address && <p>{h.address}</p>}
      {h.notes && <p className="pt-2 text-muted">{h.notes}</p>}

      <Section title={t.household.members}>
        {h.profiles.map((p) => (
          <Row key={p.id} href={`/people/${p.id}`}>{p.display_name}</Row>
        ))}
      </Section>

      {me.household_id === h.id && (
        <details className="pt-6">
          <summary className="cursor-pointer text-link">{t.edit}</summary>
          <ActionForm action={saveHousehold}>
            <Field label={t.household.name}>
              <Input name="name" defaultValue={h.name} required />
            </Field>
            <Field label={t.household.address}>
              <Input name="address" defaultValue={h.address ?? ""} autoComplete="street-address" />
            </Field>
            <Field label={t.household.notes}>
              <Textarea name="notes" defaultValue={h.notes ?? ""} />
            </Field>
            <Submit>{t.save}</Submit>
          </ActionForm>
        </details>
      )}
    </Page>
  );
}
