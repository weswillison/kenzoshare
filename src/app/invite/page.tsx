import { ActionForm, Submit } from "@/components/action-form";
import { Empty, Field, Input, Page, Row, Section } from "@/components/ui";
import { sendInvite } from "@/modules/core/actions";
import { requireMember } from "@/modules/core/me";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { t } from "@/strings/en";

export default async function InvitePage() {
  const me = await requireMember();
  const supabase = await createClient();
  const { data: invites } = await supabase
    .from("invites")
    .select("id, email, status, created_at")
    .eq("inviter_id", me.id)
    .order("created_at", { ascending: false });

  return (
    <Page title={t.invite.title} info={t.invite.info}>
      <ActionForm action={sendInvite}>
        <Field label={t.invite.email}>
          <Input name="email" type="email" inputMode="email" autoComplete="off" required />
        </Field>
        <Submit>{t.invite.send}</Submit>
      </ActionForm>

      <Section title={t.invite.yours}>
        {invites?.length ? invites.map((i) => (
          <Row key={i.id}>
            <span className="min-w-0 truncate">{i.email}</span>
            <span className="ml-auto shrink-0 text-sm text-muted">
              {t.invite.status[i.status]} · {formatDate(i.created_at)}
            </span>
          </Row>
        )) : <Empty />}
      </Section>
    </Page>
  );
}
