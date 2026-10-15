import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ActionForm, Submit } from "@/components/action-form";
import { Field, Input, Muted, Page, Row, Section, TextLink } from "@/components/ui";
import { requireMember } from "@/modules/core/me";
import {
  closeRequest, confirmReturn, handOff, handOver, lendAgain, pauseItem, requestItem, retireItem, returnItem,
} from "@/modules/garage/actions";
import { PhotoInput } from "@/modules/garage/photo-input";
import { PauseFields } from "@/modules/garage/pause-fields";
import { signPhotos, thumbPath } from "@/modules/garage/photos";
import { createClient } from "@/lib/supabase/server";
import { formatCents, formatDate } from "@/lib/format";
import { t } from "@/strings/en";

export default async function ItemPage({ params }: PageProps<"/garage/[id]">) {
  const me = await requireMember();
  const { id } = await params;
  const supabase = await createClient();

  const { data: item } = await supabase
    .from("garage_items")
    .select("*, households(id, name), garage_categories(name)")
    .eq("id", id)
    .maybeSingle();
  if (!item || item.status === "retired") notFound();
  const mine = item.household_id === me.household_id;

  const [{ data: loans }, { data: queue }, { data: myRequest }, { data: requests }] = await Promise.all([
    // RLS returns only the open loan for most people, and full history for
    // the owning household and the borrower.
    supabase
      .from("garage_loans")
      .select("*, borrower:profiles!garage_loans_borrower_id_fkey(id, display_name), ender:profiles!garage_loans_ended_by_fkey(display_name)")
      .eq("item_id", id)
      .order("started_at", { ascending: false }),
    supabase.rpc("garage_queue", { p_item: id }).single(),
    supabase.from("garage_requests").select("id").eq("item_id", id).eq("requester_id", me.id).eq("status", "pending").maybeSingle(),
    mine
      ? supabase
          .from("garage_requests")
          .select("id, created_at, due_on, requester:profiles!garage_requests_requester_id_fkey(id, display_name)")
          .eq("item_id", id)
          .eq("status", "pending")
          .order("created_at")
      : Promise.resolve({ data: [] }),
  ]);

  const open = loans?.find((l) => !l.ended_at);
  const iHaveIt = open?.borrower_id === me.id;
  const { data: next } = iHaveIt
    ? await supabase.rpc("garage_next_in_line", { p_item: id }).maybeSingle()
    : { data: null };
  // A loan that ended in a hand-off didn't come back, so it isn't confirmed.
  const handedOff = new Set(loans?.map((l) => l.previous_loan_id));
  const unconfirmed = mine ? (loans ?? []).filter((l) => l.ended_at && !l.confirmed_at && !handedOff.has(l.id)) : [];
  const history = mine ? (loans ?? []).filter((l) => l.ended_at) : [];

  const photos = await signPhotos([
    item.photo_path,
    ...history.flatMap((l) => [l.start_photo_path, l.return_photo_path].map((p) => p && thumbPath(p))),
  ]);
  const photo = item.photo_path && photos.get(item.photo_path);
  const pausedUntil = item.paused_until && formatDate(item.paused_until);

  return (
    <Page title={item.name} info={t.garage.replacementInfo}>
      {photo && <img src={photo} alt="" className="mb-4 w-full rounded object-cover" />}
      <p className="text-lg">
        {formatCents(item.replacement_cost_cents)} <Muted>{t.garage.replacementCost.toLowerCase()}</Muted>
      </p>

      <dl className="pt-3">
        {item.comes_with && <Fact label={t.garage.comesWith}>{item.comes_with}</Fact>}
        {item.condition && <Fact label={t.garage.condition}>{item.condition}</Fact>}
        {item.location && <Fact label={t.garage.location}>{item.location}</Fact>}
        <Fact label={t.garage.owner}>
          <TextLink href={`/households/${item.household_id}`}>{item.households?.name}</TextLink>
        </Fact>
        {item.notes && <Fact label={t.garage.notes}>{item.notes}</Fact>}
      </dl>

      {/* Where it is right now */}
      <div className="mt-6 border-t border-line pt-4">
        {item.status === "paused" ? (
          <p>{pausedUntil ? t.garage.pausedUntil(pausedUntil) : t.garage.notLending}</p>
        ) : open ? (
          <p>
            {iHaveIt ? t.garage.youHave(formatDate(open.started_at)) : t.garage.with(open.borrower?.display_name ?? "", formatDate(open.started_at))}
            {open.due_on && <Muted> · {t.garage.backBy(formatDate(open.due_on))}</Muted>}
          </p>
        ) : (
          <p>{t.garage.available}</p>
        )}
        {(queue?.waiting ?? 0) > 0 && <p className="text-sm text-muted">{t.garage.waiting(queue!.waiting)}</p>}

        {open && (iHaveIt || mine) && (
          <Expand label={t.garage.markReturned}>
            <ActionForm action={returnItem.bind(null, id, open.id)}>
              <PhotoInput name="photo_path" folder={`loan/${open.id}`} label={t.garage.photoOptional} />
              <Submit>{t.garage.markReturned}</Submit>
            </ActionForm>
          </Expand>
        )}
        {iHaveIt && next && item.status === "available" && (
          <Expand label={t.garage.handOffTo(next.display_name)}>
            <p className="pt-2 text-sm text-muted">{t.garage.handOffInfo}</p>
            <ActionForm action={handOff.bind(null, id, open!.id, next.request_id)}>
              <PhotoInput name="photo_path" folder={`loan/${open!.id}`} label={t.garage.photoOptional} />
              <Submit>{t.garage.handOffTo(next.display_name)}</Submit>
            </ActionForm>
          </Expand>
        )}
      </div>

      {/* Asking */}
      {!mine && !iHaveIt && item.status === "available" && (
        myRequest ? (
          <div className="pt-4">
            <p>{t.garage.asked(queue?.my_position ?? 1)}</p>
            <form action={closeRequest.bind(null, id, myRequest.id)}>
              <Submit quiet>{t.garage.cancelAsk}</Submit>
            </form>
          </div>
        ) : (
          <ActionForm action={requestItem.bind(null, id)}>
            <Field label={t.garage.backByLabel}>
              <Input name="due_on" type="date" />
            </Field>
            <Submit>{t.garage.ask}</Submit>
          </ActionForm>
        )
      )}

      {/* The owning household */}
      {mine && requests && requests.length > 0 && (
        <Section title={t.garage.requests}>
          {requests.map((r) => (
            <div key={r.id} className="border-b border-line py-2">
              <div className="flex items-center gap-3">
                <span>
                  {r.requester?.display_name} <Muted>· {formatDate(r.created_at)}</Muted>
                  {r.due_on && <Muted> · {t.garage.backBy(formatDate(r.due_on))}</Muted>}
                </span>
                <form action={closeRequest.bind(null, id, r.id)} className="ml-auto">
                  <Submit quiet>{t.garage.notNow}</Submit>
                </form>
              </div>
              {!open && item.status === "available" && r === requests[0] && (
                <ActionForm action={handOver.bind(null, id, r.id)}>
                  <PhotoInput name="photo_path" folder={`item/${id}`} label={t.garage.photoOptional} />
                  <Submit>{t.garage.handOver}</Submit>
                </ActionForm>
              )}
            </div>
          ))}
        </Section>
      )}

      {unconfirmed.map((l) => (
        <Row key={l.id}>
          <span>{t.garage.returned(l.ender?.display_name ?? "", formatDate(l.ended_at!))}</span>
          <form action={confirmReturn.bind(null, id, l.id)} className="ml-auto">
            <Submit quiet>{t.garage.confirm}</Submit>
          </form>
        </Row>
      ))}

      {mine && (
        <div className="flex flex-wrap items-start gap-x-4 pt-6 [&>details]:pt-0">
          <TextLink href={`/garage/${id}/edit`}>{t.garage.edit}</TextLink>
          {item.status === "paused" ? (
            <form action={lendAgain.bind(null, id)}><button className="text-link">{t.garage.lendAgain}</button></form>
          ) : (
            <Expand label={t.garage.pause}>
              <ActionForm action={pauseItem.bind(null, id)}>
                <PauseFields />
                <Submit>{t.garage.pause}</Submit>
              </ActionForm>
            </Expand>
          )}
        </div>
      )}

      {mine && history.length > 0 && (
        <Section title={t.garage.history} info={t.garage.historyInfo}>
          {history.map((l) => (
            <Row key={l.id}>
              <span>
                {l.borrower?.display_name}{" "}
                <Muted>· {formatDate(l.started_at)} – {formatDate(l.ended_at!)}</Muted>
              </span>
              <span className="ml-auto flex gap-1">
                {[l.start_photo_path, l.return_photo_path].map((p) => {
                  const src = p && photos.get(thumbPath(p));
                  return src ? <img key={p} src={src} alt="" className="size-10 rounded object-cover" /> : null;
                })}
              </span>
            </Row>
          ))}
        </Section>
      )}

      <div className="flex flex-wrap gap-x-4 pt-8 text-sm">
        <TextLink href={`/issues/new?item=${id}${open && !iHaveIt ? `&about=${open.borrower_id}` : ""}`}>{t.garage.report}</TextLink>
        {mine && (open
          ? <Muted>{t.garage.retireWhenBack}</Muted>
          : <form action={retireItem.bind(null, id)}><button className="text-muted">{t.garage.retire}</button></form>
        )}
      </div>
    </Page>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-2 py-1">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function Expand({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className="pt-3">
      <summary className="cursor-pointer text-link">{label}</summary>
      {children}
    </details>
  );
}
