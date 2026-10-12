import { Empty, Muted, Page, Row, Section } from "@/components/ui";
import { requireMember } from "@/modules/core/me";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { t } from "@/strings/en";

export default async function MinePage() {
  const me = await requireMember();
  const supabase = await createClient();

  const [{ data: ours }, { data: openLoans }, { data: requests }, { data: waiting }] = await Promise.all([
    me.household_id
      ? supabase.from("garage_items").select("id, name, status").eq("household_id", me.household_id).neq("status", "retired").order("name")
      : Promise.resolve({ data: [] }),
    supabase.from("garage_loans").select("id, item_id, borrower_id, started_at, due_on, garage_items(name), borrower:profiles!garage_loans_borrower_id_fkey(display_name)").is("ended_at", null),
    supabase.from("garage_requests").select("item_id").eq("status", "pending").neq("requester_id", me.id),
    supabase.from("garage_requests").select("id, item_id, garage_items(name)").eq("requester_id", me.id).eq("status", "pending"),
  ]);
  const loanByItem = new Map(openLoans?.map((l) => [l.item_id, l]));
  const asked = new Map<string, number>();
  requests?.forEach((r) => asked.set(r.item_id, (asked.get(r.item_id) ?? 0) + 1));
  const iHave = (openLoans ?? []).filter((l) => l.borrower_id === me.id);

  return (
    <Page title={t.garage.mine}>
      <Section title={t.garage.weLend}>
        {ours?.length ? ours.map((i) => {
          const loan = loanByItem.get(i.id);
          const n = asked.get(i.id) ?? 0;
          return (
            <Row key={i.id} href={`/garage/${i.id}`}>
              <span>{i.name}</span>
              <span className="ml-auto text-right text-sm text-muted">
                {i.status === "paused" ? t.garage.paused : loan ? t.garage.with(loan.borrower?.display_name ?? "", formatDate(loan.started_at)) : t.garage.available}
                {n > 0 && <span className="block text-fg">{t.garage.waiting(n)}</span>}
              </span>
            </Row>
          );
        }) : <Empty />}
      </Section>

      <Section title={t.garage.iHave}>
        {iHave.length ? iHave.map((l) => (
          <Row key={l.id} href={`/garage/${l.item_id}`}>
            <span>{l.garage_items?.name}</span>
            <span className="ml-auto text-sm text-muted">
              {formatDate(l.started_at)}{l.due_on && <Muted> · {t.garage.backBy(formatDate(l.due_on))}</Muted>}
            </span>
          </Row>
        )) : <Empty />}
      </Section>

      <Section title={t.garage.iWaitFor}>
        {waiting?.length ? waiting.map((r) => (
          <Row key={r.id} href={`/garage/${r.item_id}`}>{r.garage_items?.name}</Row>
        )) : <Empty />}
      </Section>
    </Page>
  );
}
