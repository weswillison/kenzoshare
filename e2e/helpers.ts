import { randomUUID } from "node:crypto";
import { test as base, expect, type Page } from "@playwright/test";
import { baseURL, mailpitURL } from "./settings";

// A second, isolated phone session for the neighbor accepting an invite.
// Contexts created in a test inherit the project's device and other options.
export const test = base.extend<{ neighbor: Page }>({
  neighbor: async ({ browser }, provideNeighbor) => {
    const context = await browser.newContext();
    await provideNeighbor(await context.newPage());
    await context.close();
  },
});
export { expect };

type Message = { ID: string; To: { Address: string }[] };

async function messages(page: Page, email: string): Promise<Message[]> {
  const response = await page.request.get(`${mailpitURL}/api/v1/search`, {
    params: { query: `to:${email}` },
  });
  expect(response.ok(), "Mailpit search should succeed").toBeTruthy();
  const body = await response.json();
  return body.messages.filter((m: Message) => m.To.some((to) => to.Address.toLowerCase() === email));
}

async function openEmail(page: Page, email: string, before: Set<string>, type: "email" | "invite") {
  let id: string | undefined;
  await expect.poll(async () => {
    id = (await messages(page, email)).find((m) => !before.has(m.ID))?.ID;
    return !!id;
  }, { message: `A new local ${type} email should arrive for ${email}`, timeout: 15_000 }).toBe(true);

  const response = await page.request.get(`${mailpitURL}/api/v1/message/${id}`);
  expect(response.ok(), "Mailpit message should be readable").toBeTruthy();
  const { HTML } = await response.json();
  const href = HTML.match(/href="([^"]+)"/)?.[1]?.replaceAll("&amp;", "&");
  if (!href) throw new Error("The email has no sign-in link.");
  const link = new URL(href);
  expect(link.origin).toBe(baseURL);
  expect(link.pathname).toBe("/auth/confirm");
  expect(link.searchParams.get("type")).toBe(type);
  expect(link.searchParams.get("token_hash")).toBeTruthy();
  await page.goto(link.href);
}

export async function submit(page: Page, field: string) {
  // Field names are part of the server-action contract, independent of UI copy.
  await page.locator("form").filter({ has: page.locator(`[name="${field}"]`) })
    .locator('button[type="submit"]').click();
}

export async function signIn(page: Page, email: string) {
  const before = new Set((await messages(page, email)).map((m) => m.ID));
  await page.goto("/login");
  await page.locator('[name="email"]').fill(email);
  await submit(page, "email");
  await expect(page.getByRole("status")).toContainText(email);
  await openEmail(page, email, before, "email");
  await expect(page).toHaveURL(`${baseURL}/`);
}

export async function invite(member: Page, neighbor: Page) {
  const email = `e2e-${randomUUID()}@example.test`;
  await member.goto("/invite");
  await member.locator('[name="email"]').fill(email);
  await submit(member, "email");
  await expect(member.getByRole("status")).toContainText(email);
  // The address is new, so any message to it is the invite.
  await openEmail(neighbor, email, new Set(), "invite");
  await expect(neighbor).toHaveURL(`${baseURL}/welcome`);
  const name = `Test Neighbor ${randomUUID().slice(0, 8)}`;
  await neighbor.locator('[name="display_name"]').fill(name);
  await submit(neighbor, "display_name");
  await expect(neighbor.locator('[name="name"]')).toBeVisible();
  return { email, name };
}
