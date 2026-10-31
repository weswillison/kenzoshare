import { notFound } from "next/navigation";
import { Page } from "@/components/ui";
import { requireMember } from "@/modules/core/me";
import { ItemForm } from "@/modules/garage/item-form";
import { createClient } from "@/lib/supabase/server";
import { t } from "@/strings/en";

export default async function EditItemPage({ params }: PageProps<"/garage/[id]/edit">) {
  const me = await requireMember();
  const { id } = await params;
  const supabase = await createClient();
  const { data: item } = await supabase.from("garage_items").select("*").eq("id", id).maybeSingle();
  if (!item || item.household_id !== me.household_id) notFound();
  return (
    <Page title={t.garage.edit}>
      <ItemForm item={item} />
    </Page>
  );
}
