import { Page, TextLink } from "@/components/ui";
import { requireMember } from "@/modules/core/me";
import { ItemForm } from "@/modules/garage/item-form";
import { t } from "@/strings/en";

export default async function NewItemPage() {
  const me = await requireMember();
  return (
    <Page title={t.garage.list}>
      {me.household_id ? <ItemForm /> : <TextLink href="/welcome">{t.garage.needsHousehold}</TextLink>}
    </Page>
  );
}
