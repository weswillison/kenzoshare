import { Submit } from "@/components/action-form";
import { Row, Section, TextLink } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { t } from "@/strings/en";
import { keepPaused, lendAgain } from "./actions";

export async function GarageHome({ meId, householdId }: { meId: string; householdId: string | null }) {
  const supabase = await createClient();
  const [{ data: snoozed }, { count: asks }, { data: iHave }] = await Promise.all([
    householdId
      ? supabase.from("garage_items").select("id, name").eq("household_id", householdId).eq("status", "paused").lt("paused_until", new Date().toISOString())
      : Promise.resolve({ data: [] }),
    householdId
      ? supabase.from("garage_requests").select("id, garage_items!inner(household_id)", { count: "exact", head: true })
          .eq("status", "pending").eq("garage_items.household_id", householdId)
      : Promise.resolve({ count: 0 }),
    supabase.from("garage_loans").select("id, item_id, started_at, garage_items(name)").is("ended_at", null).eq("borrower_id", meId),
  ]);

  return (
    <Section title={t.garage.title} action={<TextLink href="/garage/new">+ {t.garage.list}</TextLink>}>
      {snoozed?.map((i) => (
        <Row key={i.id}>
          <span>{t.garage.lendAgainPrompt(i.name)}</span>
          <span className="ml-auto flex gap-2">
            <form action={lendAgain.bind(null, i.id)}><Submit quiet>{t.home.approve}</Submit></form>
            <form action={keepPaused.bind(null, i.id)}><Submit quiet>{t.garage.keepPaused}</Submit></form>
          </span>
        </Row>
      ))}
      {(asks ?? 0) > 0 && (
        <Row href="/garage/mine"><span className="font-medium">{t.garage.someoneAsked(asks!)}</span></Row>
      )}
      {iHave?.map((l) => (
        <Row key={l.id} href={`/garage/${l.item_id}`}>
          <span>{l.garage_items?.name}</span>
          <span className="ml-auto text-sm text-muted">{t.garage.iHave} · {formatDate(l.started_at)}</span>
        </Row>
      ))}
      <Row href="/garage"><span className="text-link">{t.garage.browse}</span></Row>
    </Section>
  );
}
