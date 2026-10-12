import { notFound } from "next/navigation";
import { ActionForm, Submit } from "@/components/action-form";
import { Field, Muted, Page, Textarea, TextLink } from "@/components/ui";
import { reopenIssue, resolveIssue } from "@/modules/core/actions";
import { requireMember } from "@/modules/core/me";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { t } from "@/strings/en";

export default async function IssuePage({ params }: PageProps<"/issues/[id]">) {
  await requireMember();
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
      {item && <p className="pt-3"><TextLink href={`/garage/${item.id}`}>{item.name}</TextLink></p>}
      <p className="py-4 whitespace-pre-wrap">{i.description}</p>
      <dl className="text-sm">
        <div className="flex gap-2 py-1">
          <dt><Muted>{t.issues.reportedBy}</Muted></dt>
          <dd><TextLink href={`/people/${i.reporter!.id}`}>{i.reporter!.display_name}</TextLink></dd>
        </div>
        {i.about && (
          <div className="flex gap-2 py-1">
            <dt><Muted>{t.issues.about}</Muted></dt>
            <dd><TextLink href={`/people/${i.about.id}`}>{i.about.display_name}</TextLink></dd>
          </div>
        )}
      </dl>

      {i.status === "open" ? (
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
          <form action={reopenIssue.bind(null, i.id)}>
            <Submit quiet>{t.issues.reopen}</Submit>
          </form>
        </div>
      )}
    </Page>
  );
}
