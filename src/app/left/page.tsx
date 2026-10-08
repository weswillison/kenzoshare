import { redirect } from "next/navigation";
import { Page } from "@/components/ui";
import { MyRecord } from "@/modules/core/my-record";
import { signOut } from "@/modules/core/actions";
import { getMe } from "@/modules/core/me";
import { t } from "@/strings/en";

export default async function LeftPage() {
  const me = await getMe();
  if (!me) redirect("/login");
  if (me.status !== "left") redirect("/");
  return (
    <Page title={t.left.title}>
      <p className="py-3">{t.left.body}</p>
      <MyRecord />
      <form action={signOut} className="pt-8">
        <button className="text-link">{t.profile.signOut}</button>
      </form>
    </Page>
  );
}
