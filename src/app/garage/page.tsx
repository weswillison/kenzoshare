import Link from "next/link";
import { Empty, Page, Row, TextLink } from "@/components/ui";
import { requireMember } from "@/modules/core/me";
import { signPhotos, thumbPath } from "@/modules/garage/photos";
import { createClient } from "@/lib/supabase/server";
import { t } from "@/strings/en";

export default async function GaragePage({ searchParams }: PageProps<"/garage">) {
  await requireMember();
  const { q, c } = await searchParams;
  const query = typeof q === "string" ? q.replace(/[,()%]/g, " ").trim() : "";
  const category = typeof c === "string" ? c : "";

  const supabase = await createClient();
  let items = supabase
    .from("garage_items")
    .select("id, name, status, photo_path, households(name)")
    .neq("status", "retired")
    .order("name");
  if (query) items = items.or(`name.ilike.%${query}%,comes_with.ilike.%${query}%`);
  if (category) items = items.eq("category_id", category);

  const [{ data: list }, { data: categories }, { data: openLoans }] = await Promise.all([
    items,
    supabase.from("garage_categories").select("id, name").order("sort"),
    supabase.from("garage_loans").select("item_id").is("ended_at", null),
  ]);
  const out = new Set(openLoans?.map((l) => l.item_id));
  const photos = await signPhotos((list ?? []).map((i) => i.photo_path && thumbPath(i.photo_path)));

  const chip = (id: string, label: string) => (
    <Link
      key={id || "all"}
      href={{ pathname: "/garage", query: { ...(query && { q: query }), ...(id && { c: id }) } }}
      className={`shrink-0 rounded-full border px-3 py-1 text-sm ${category === id ? "border-fg" : "border-line text-muted"}`}
    >
      {label}
    </Link>
  );

  return (
    <Page title={t.garage.title} action={<TextLink href="/garage/new">+ {t.garage.list}</TextLink>}>
      <form className="flex gap-2">
        {category && <input type="hidden" name="c" value={category} />}
        <input
          name="q"
          type="search"
          defaultValue={query}
          placeholder={t.garage.search}
          aria-label={t.garage.search}
          className="w-full rounded border border-line bg-bg px-3 py-2"
        />
      </form>
      <nav className="flex gap-2 overflow-x-auto py-3 [scrollbar-width:none]">
        {chip("", t.garage.all)}
        {categories?.map((cat) => chip(cat.id, cat.name))}
      </nav>
      <p className="pb-1 text-right text-sm"><TextLink href="/garage/mine">{t.garage.mine}</TextLink></p>

      {list?.length ? list.map((i) => {
        const thumb = i.photo_path && photos.get(thumbPath(i.photo_path));
        const state = i.status === "paused" ? t.garage.paused : out.has(i.id) ? t.garage.out : null;
        return (
          <Row key={i.id} href={`/garage/${i.id}`}>
            {thumb ? (
              <img src={thumb} alt="" className="size-12 shrink-0 rounded object-cover" />
            ) : (
              <span className="size-12 shrink-0 rounded bg-hover" />
            )}
            <span className="min-w-0">
              <span className="block truncate">{i.name}</span>
              <span className="block truncate text-sm text-muted">{i.households?.name}</span>
            </span>
            {state && <span className="ml-auto shrink-0 text-sm text-muted">{state}</span>}
          </Row>
        );
      }) : <Empty />}
    </Page>
  );
}
