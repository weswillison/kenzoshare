import "server-only";

const FROM = "KenzoShare <noreply@mail.kenzoshare.org>";

// Plain-text email through Resend's HTTP API. Without a key (local
// development), the email is printed to the server log instead.
export async function sendEmail(to: string[], subject: string, text: string) {
  if (to.length === 0) return;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log("[email]", { to, subject, text });
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to, subject, text }),
  });
  // A failed email shouldn't undo the borrow itself; log it and move on.
  if (!res.ok) console.error("sendEmail", res.status, await res.text());
}
