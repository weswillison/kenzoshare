import { notFound } from "next/navigation";
import { Muted, Page, Row, Section, TextLink } from "@/components/ui";
import { requireMember } from "@/modules/core/me";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { t } from "@/strings/en";

export default async function PersonPage({ params }: PageProps<"/people/[id]">) {
  await requireMember();
  const { id } = await params;
  const supabase = await createClient();
  const { data: p } = await supabase
    .from("profiles")
    .select("*, households(id, name)")
    .eq("id", id)
    .maybeSingle();
  if (!p) notFound();
  const { data: facts } = await supabase.rpc("profile_facts", { p_profile: p.id }).maybeSingle();
  const { data: inviter } = p.invited_by
    ? await supabase.from("profiles").select("id, display_name").eq("id", p.invited_by).maybeSingle()
    : { data: null };

  const digits = p.phone?.replace(/[^\d+]/g, "");
  const contacts = [
    digits && { key: "text", href: `sms:${digits}`, label: `${t.person.text} ${p.phone}` },
    digits && { key: "call", href: `tel:${digits}`, label: `${t.person.call} ${p.phone}` },
    { key: "email", href: `mailto:${p.email}`, label: `${t.person.email} ${p.email}` },
  ].filter((c): c is { key: string; href: string; label: string } => Boolean(c));

  return (
    <Page title={p.display_name}>
      {p.bio && <p className="pb-2">{p.bio}</p>}
      {facts && (facts.things_lent > 0 || facts.times_borrowed > 0) && (
        <p className="pb-2 text-muted">
          {[facts.things_lent > 0 && t.person.lends(facts.things_lent), facts.times_borrowed > 0 && t.person.borrowed(facts.times_borrowed)]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}

      <Section title={t.person.contact}>
        {contacts.map((c) => (
          <Row key={c.key}>
            <a href={c.href} className="text-link">{c.label}</a>
            {p.preferred_contact === c.key && <span className="ml-auto text-sm text-muted">{t.person.prefers}</span>}
          </Row>
        ))}
      </Section>

      <Section title={t.person.household}>
        {p.households ? (
          <Row href={`/households/${p.households.id}`}>{p.households.name}</Row>
        ) : <p className="py-3 text-muted">{t.none}</p>}
      </Section>

      <dl className="pt-6 text-sm">
        {p.languages.length > 0 && <Fact label={t.person.languages}>{p.languages.join(", ")}</Fact>}
        {inviter && (
          <Fact label={t.person.invitedBy}>
            <TextLink href={`/people/${inviter.id}`}>{inviter.display_name}</TextLink>
          </Fact>
        )}
        <Fact label={t.person.joined}>{formatDate(p.joined_at)}</Fact>
      </dl>

      <p className="pt-8">
        <TextLink href={`/issues/new?about=${p.id}`}>{t.person.report}</TextLink>
      </p>
    </Page>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2 py-1">
      <dt><Muted>{label}</Muted></dt>
      <dd>{children}</dd>
    </div>
  );
}
