import { ActionForm, Submit } from "@/components/action-form";
import { Field, Input, Page } from "@/components/ui";
import { sendLoginLink } from "@/modules/core/actions";
import { t } from "@/strings/en";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  return (
    <Page title={t.login.title} info={t.login.info}>
      {error && <p role="alert" className="text-danger">{t.login.badLink}</p>}
      <ActionForm action={sendLoginLink}>
        <Field label={t.login.email}>
          <Input name="email" type="email" autoComplete="email" inputMode="email" required autoFocus />
        </Field>
        <Submit>{t.login.send}</Submit>
      </ActionForm>
      <p className="pt-3 text-sm text-muted">{t.login.sentHelp}</p>
    </Page>
  );
}
