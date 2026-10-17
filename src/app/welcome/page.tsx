import { redirect } from "next/navigation";
import { ActionForm, Submit } from "@/components/action-form";
import { Field, Input, Page, Row, Section, TextLink, Muted } from "@/components/ui";
import { askToJoin, createHousehold, saveName } from "@/modules/core/actions";
import { getMe } from "@/modules/core/me";
import { createClient } from "@/lib/supabase/server";
import { t } from "@/strings/en";

export default async function WelcomePage() {
  const me = await getMe();
  if (!me) redirect("/login");
  if (me.status === "left") redirect("/left");

  if (!me.display_name) {
    return (
      <Page title={t.welcome.title}>
        <ActionForm action={saveName}>
          <Field label={t.welcome.nameLabel} hint={t.welcome.nameHelp}>
            <Input name="display_name" autoComplete="name" required autoFocus />
          </Field>
          <Submit>{t.save}</Submit>
        </ActionForm>
      </Page>
    );
  }

  if (me.household_id) redirect("/");

  const supabase = await createClient();
  const [{ data: pending }, { data: households }] = await Promise.all([
    supabase
      .from("household_join_requests")
      .select("id, households(name)")
      .eq("profile_id", me.id)
      .eq("status", "pending")
      .maybeSingle(),
    supabase.from("households").select("id, name, profiles(display_name)").order("name"),
  ]);

  return (
    <Page
      title={t.welcome.householdTitle}
      info={t.welcome.householdInfo}
      action={<TextLink href="/">{t.welcome.skip}</TextLink>}
    >
      {pending && <p className="py-3">{t.welcome.waiting(pending.households?.name ?? "")}</p>}

      {!pending && (households?.length ?? 0) > 0 && (
        <Section title={t.welcome.join}>
          {households!.map((h) => (
            <Row key={h.id}>
              <span>
                {h.name} <Muted>· {h.profiles.map((p) => p.display_name).join(", ")}</Muted>
              </span>
              <form action={askToJoin.bind(null, h.id)} data-testid={`join-household-${h.id}`} className="ml-auto">
                <Submit quiet>{t.welcome.ask}</Submit>
              </form>
            </Row>
          ))}
        </Section>
      )}

      <Section title={t.welcome.startNew}>
        <ActionForm action={createHousehold}>
          <Field label={t.welcome.householdName}>
            <Input name="name" placeholder={t.welcome.householdNameHint} required />
          </Field>
          <Field label={t.welcome.address}>
            <Input name="address" autoComplete="street-address" />
          </Field>
          <Submit>{t.welcome.create}</Submit>
        </ActionForm>
      </Section>
    </Page>
  );
}
