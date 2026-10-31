import { notFound, redirect } from "next/navigation";
import { ActionForm, Submit } from "@/components/action-form";
import { Field, Muted, Page, Textarea, TextLink } from "@/components/ui";
import { reopenIssue, resolveIssue } from "@/modules/core/actions";
import { getMe } from "@/modules/core/me";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { t } from "@/strings/en";

export default async function IssuePage({ params }: PageProps<"/issues/[id]">) {
  // Someone who left can still open a problem they're part of; RLS limits
  // them to those. Everything else about the issue is for active members.
  const me = await getMe();
  if (!me) redirect("/login");
  const active = me.status === "active";
  if (active && !me.display_name) redirect("/welcome");
  const { id } = await params;
  const supabase = await createClient();
  const { data: i } = await supabase
    .from("issues")
    .select(`*,
      reporter:profiles!issues_reporter_id_fkey(id, display_name),
      about:profiles!issues_about_profile_id_fkey(id, display_name),
      resolver:profiles!issues_resolved_by_fkey(id, display_name)`)
    .eq("id", id)
    .maybeSingle();
  if (!i) notFound();
  const { data: item } = i.subject_type === "garage_item" && i.subject_id
    ? await supabase.from("garage_items").select("id, name").eq("id", i.subject_id).maybeSingle()
    : { data: null };

  return (
    <Page title={t.issues.kinds[i.kind]} info={t.issues.info}>
      <p className="text-sm">
        <Muted>{i.status === "open" ? t.issues.open : t.issues.resolved} · {formatDate(i.created_at)}</Muted>
      </p>
      {item && <p className="pt-3">{active ? <TextLink href={`/garage/${item.id}`}>{item.name}</TextLink> : item.name}</p>}
      <p className="py-4 whitespace-pre-wrap">{i.description}</p>
      <dl className="text-sm">
        <div className="flex gap-2 py-1">
          <dt><Muted>{t.issues.reportedBy}</Muted></dt>
          <dd><Person id={i.reporter!.id} name={i.reporter!.display_name} link={active} /></dd>
        </div>
        {i.about && (
          <div className="flex gap-2 py-1">
            <dt><Muted>{t.issues.about}</Muted></dt>
            <dd><Person id={i.about.id} name={i.about.display_name} link={active} /></dd>
          </div>
        )}
      </dl>

      {i.status === "open" ? active && (
        <ActionForm action={resolveIssue}>
          <input type="hidden" name="id" value={i.id} />
          <Field label={t.issues.resolutionNote}>
            <Textarea name="resolution_note" />
          </Field>
          <Submit>{t.issues.resolve}</Submit>
        </ActionForm>
      ) : (
        <div className="border-t border-line pt-4 mt-6">
          {i.resolution_note && <p className="whitespace-pre-wrap">{i.resolution_note}</p>}
          <p className="pt-1 text-sm">
            <Muted>
              {t.issues.resolvedBy} {i.resolver?.display_name} · {i.resolved_at && formatDate(i.resolved_at)}
            </Muted>
          </p>
          {active && (
            <form action={reopenIssue.bind(null, i.id)}>
              <Submit quiet>{t.issues.reopen}</Submit>
            </form>
          )}
        </div>
      )}
    </Page>
  );
}

function Person({ id, name, link }: { id: string; name: string; link: boolean }) {
  return link ? <TextLink href={`/people/${id}`}>{name}</TextLink> : <>{name}</>;
}
