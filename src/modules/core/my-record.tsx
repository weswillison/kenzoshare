import { Empty, Row, Section } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { t } from "@/strings/en";
import { getMe } from "./me";

export async function MyRecord() {
  const me = await getMe();
  if (!me) return null;
  const supabase = await createClient();

  const [{ data: stats }, { data: events }, { data: issues }] = await Promise.all([
    supabase.rpc("my_stats"),
    supabase
      .from("activity_events")
      .select("id, event_type, created_at")
      .eq("actor_id", me.id)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("issues")
      .select("id, kind, status, created_at")
      .or(`reporter_id.eq.${me.id},about_profile_id.eq.${me.id}`)
      .order("created_at", { ascending: false }),
  ]);

  const counts = (stats ?? []).filter((s) => s.n > 0);

  return (
    <>
      <Section title={t.profile.record} info={t.profile.recordInfo}>
        {counts.length === 0 ? <Empty /> : counts.map((s) => (
          <Row key={`${s.module}-${s.event_type}`}>
            <span>{t.events[s.event_type] ?? t.stats[s.event_type] ?? s.event_type}</span>
            <span className="ml-auto tabular-nums">{s.n}</span>
          </Row>
        ))}
      </Section>

      <Section title={t.profile.activity}>
        {events?.length ? events.map((e) => (
          <Row key={e.id}>
            <span>{t.events[e.event_type] ?? e.event_type}</span>
            <span className="ml-auto text-muted">{formatDate(e.created_at)}</span>
          </Row>
        )) : <Empty />}
      </Section>

      <Section title={t.profile.issues}>
        {issues?.length ? issues.map((i) => (
          <Row key={i.id} href={`/issues/${i.id}`}>
            <span>{t.issues.kinds[i.kind]}</span>
            <span className="ml-auto text-muted">
              {i.status === "open" ? t.issues.open : t.issues.resolved} · {formatDate(i.created_at)}
            </span>
          </Row>
        )) : <Empty />}
      </Section>
    </>
  );
}
