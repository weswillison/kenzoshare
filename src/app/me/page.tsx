import { ActionForm, Submit } from "@/components/action-form";
import { Field, Input, Page, Select, Textarea } from "@/components/ui";
import { saveProfile, signOut } from "@/modules/core/actions";
import { requireMember } from "@/modules/core/me";
import { MyRecord } from "@/modules/core/my-record";
import { t } from "@/strings/en";

export default async function MePage() {
  const me = await requireMember();
  return (
    <Page title={t.profile.title} action={
      <form action={signOut}><button className="text-link">{t.profile.signOut}</button></form>
    }>
      <details>
        <summary className="cursor-pointer py-2 text-link">{t.edit}</summary>
        <ActionForm action={saveProfile}>
          <Field label={t.profile.displayName}>
            <Input name="display_name" defaultValue={me.display_name} autoComplete="name" required />
          </Field>
          <Field label={t.profile.phone}>
            <Input name="phone" type="tel" defaultValue={me.phone ?? ""} autoComplete="tel" />
          </Field>
          <Field label={t.profile.preferredContact}>
            <Select name="preferred_contact" defaultValue={me.preferred_contact ?? ""}>
              <option value="">—</option>
              {Object.entries(t.profile.contact).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </Field>
          <Field label={t.profile.languages} hint={t.profile.languagesHint}>
            <Input name="languages" defaultValue={me.languages.join(", ")} />
          </Field>
          <Field label={t.profile.bio}>
            <Textarea name="bio" defaultValue={me.bio ?? ""} />
          </Field>
          <Submit>{t.save}</Submit>
        </ActionForm>
      </details>

      <MyRecord />
    </Page>
  );
}
