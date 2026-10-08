import { Submit } from "@/components/action-form";
import { Empty, Muted, Page, Row, Section, TextLink } from "@/components/ui";
import { decideJoin } from "@/modules/core/actions";
import { requireMember } from "@/modules/core/me";
import { createClient } from "@/lib/supabase/server";
import { t } from "@/strings/en";

export default async function Home() {
  const me = await requireMember();
  const supabase = await createClient();

  const [{ data: people }, { data: requests }, { count: openIssues }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, preferred_contact, households(name)")
      .eq("status", "active")
      .neq("display_name", "")
      .order("display_name"),
    me.household_id
      ? supabase
          .from("household_join_requests")
          .select("id, profiles!household_join_requests_profile_id_fkey(display_name)")
          .eq("household_id", me.household_id)
          .eq("status", "pending")
      : Promise.resolve({ data: [] }),
    supabase.from("issues").select("id", { count: "exact", head: true }).eq("status", "open"),
  ]);

  return (
    <Page>
      {!me.household_id && (
        <p className="pt-4">
          <TextLink href="/welcome">{t.home.chooseHousehold}</TextLink>
        </p>
      )}

      {requests && requests.length > 0 && (
        <Section title={t.home.joinRequests}>
          {requests.map((r) => (
            <Row key={r.id}>
              <span>{r.profiles?.display_name}</span>
              <span className="ml-auto flex gap-2">
                <form action={decideJoin.bind(null, r.id, true)}><Submit quiet>{t.home.approve}</Submit></form>
                <form action={decideJoin.bind(null, r.id, false)}><Submit quiet>{t.home.decline}</Submit></form>
              </span>
            </Row>
          ))}
        </Section>
      )}

      <Section title={t.home.people} action={<TextLink href="/invite">+ {t.home.invite}</TextLink>}>
        {people?.length ? people.map((p) => (
          <Row key={p.id} href={`/people/${p.id}`}>
            <span className="min-w-0 truncate">
              {p.display_name} {p.households && <Muted>· {p.households.name}</Muted>}
            </span>
            {p.preferred_contact && (
              <span className="ml-auto shrink-0 text-sm text-muted">{t.profile.contact[p.preferred_contact]}</span>
            )}
          </Row>
        )) : <Empty />}
      </Section>

      <Section title={t.home.problems} action={<TextLink href="/issues/new">+ {t.issues.new}</TextLink>}>
        <Row href="/issues">
          <span>{t.home.openCount(openIssues ?? 0)}</span>
        </Row>
      </Section>
    </Page>
  );
}
