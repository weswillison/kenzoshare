import { Empty, Page, Row, TextLink } from "@/components/ui";
import { requireMember } from "@/modules/core/me";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { t } from "@/strings/en";

export default async function IssuesPage() {
  await requireMember();
  const supabase = await createClient();
  // RLS already limits this to problems you're part of (or all, for stewards).
  const { data: issues } = await supabase
    .from("issues")
    .select("id, kind, status, created_at")
    .order("status")
    .order("created_at", { ascending: false });

  return (
    <Page title={t.issues.title} info={t.issues.info} action={<TextLink href="/issues/new">+ {t.issues.new}</TextLink>}>
      {issues?.length ? issues.map((i) => (
        <Row key={i.id} href={`/issues/${i.id}`}>
          <span>{t.issues.kinds[i.kind]}</span>
          <span className="ml-auto text-sm text-muted">
            {i.status === "open" ? t.issues.open : t.issues.resolved} · {formatDate(i.created_at)}
          </span>
        </Row>
      )) : <Empty />}
    </Page>
  );
}
