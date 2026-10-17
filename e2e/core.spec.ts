import { randomUUID } from "node:crypto";
import { test, expect, signIn, invite, submit } from "./helpers";
import { baseURL, blueDoor, people } from "./settings";
import { t } from "../src/strings/en";

test("a member follows an emailed sign-in link and signs out", async ({ page }) => {
  await page.goto("/me");
  await expect(page).toHaveURL(`${baseURL}/login`);

  await signIn(page, people.tom.email);
  await page.locator(`a[href="/people/${people.tom.id}"]`).click();
  await expect(page.locator(`a[href="mailto:${people.tom.email}"]`)).toBeVisible();
  await page.locator('nav a[href="/me"]').click();
  await page.getByTestId("sign-out").click();
  await expect(page).toHaveURL(`${baseURL}/login`);
  await page.goto("/");
  await expect(page).toHaveURL(`${baseURL}/login`);
});

test("profile edits persist in the directory and household", async ({ page }) => {
  await signIn(page, people.rosa.email);
  await page.locator('nav a[href="/me"]').click();
  await page.locator("details > summary").click();
  const name = `Rosa Test ${randomUUID().slice(0, 8)}`;
  const bio = "Happy to share garden tools. Automated test data.";
  await page.locator('[name="display_name"]').fill(name);
  await page.locator('[name="phone"]').fill("215-555-0199");
  await page.locator('[name="preferred_contact"]').selectOption("email");
  await page.locator('[name="languages"]').fill("English, Spanish");
  await page.locator('[name="bio"]').fill(bio);
  await submit(page, "display_name");
  await expect(page.getByRole("status")).toBeVisible();

  await page.reload();
  await page.locator("details > summary").click();
  await expect(page.locator('[name="display_name"]')).toHaveValue(name);
  await expect(page.locator('[name="preferred_contact"]')).toHaveValue("email");
  await page.locator('nav a[href="/"]').click();
  await page.locator(`a[href="/people/${people.rosa.id}"]`).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
  await expect(page.getByText(bio, { exact: true })).toBeVisible();
  await expect(page.locator('a[href="tel:2155550199"]')).toBeVisible();
  await expect(page.getByText("English, Spanish", { exact: true })).toBeVisible();
  await page.locator(`a[href="/households/${blueDoor}"]`).click();
  await expect(page.locator(`a[href="/people/${people.rosa.id}"]`)).toHaveText(name);
});

test("an invited neighbor starts a household and keeps their voucher", async ({ page, neighbor }) => {
  await signIn(page, people.marcus.email);
  const { email, name } = await invite(page, neighbor);
  const household = `Test house ${randomUUID().slice(0, 8)}`;
  await neighbor.locator('[name="name"]').fill(household);
  await neighbor.locator('[name="address"]').fill("999 Example St");
  await submit(neighbor, "name");
  await expect(neighbor).toHaveURL(`${baseURL}/`);

  // Discover the new profile through the directory, without privileged database access.
  await neighbor.locator('main a[href^="/people/"]').filter({ hasText: name }).click();
  await expect(neighbor.locator(`a[href="/people/${people.marcus.id}"]`)).toBeVisible();
  await neighbor.locator('a[href^="/households/"]').click();
  await expect(neighbor.getByRole("heading", { level: 1 })).toHaveText(household);
  await expect(neighbor.getByText("999 Example St", { exact: true })).toBeVisible();
  await neighbor.locator("details > summary").click();
  await neighbor.locator('[name="notes"]').fill("Use the side door. Automated test data.");
  await submit(neighbor, "notes");
  await expect(neighbor.getByRole("status")).toBeVisible();
  await neighbor.reload();
  await expect(neighbor.getByRole("paragraph").filter({ hasText: "Use the side door. Automated test data." })).toBeVisible();

  await page.reload();
  await expect(page.locator("main section").filter({ hasText: email })).toContainText(t.invite.status.accepted);
  await neighbor.locator('nav a[href="/me"]').click();
  await expect(neighbor.getByRole("heading", { name: t.profile.record, exact: true })).toBeVisible();
  await expect(neighbor.getByText(t.events.household_created, { exact: true })).toHaveCount(2);
});

test("an invited neighbor asks to join and a household member approves", async ({ page, neighbor }) => {
  await signIn(page, people.sam.email);
  const { name } = await invite(page, neighbor);
  await neighbor.getByTestId(`join-household-${blueDoor}`).locator('button[type="submit"]').click();
  await expect(neighbor.getByTestId(`join-household-${blueDoor}`)).toHaveCount(0);
  await expect(neighbor.getByText(t.welcome.waiting("Blue door"), { exact: true })).toBeVisible();

  await page.goto("/");
  const request = page.getByTestId("household-join-request").filter({ hasText: name });
  await request.getByTestId("approve-household-join").locator('button[type="submit"]').click();
  await expect(request).toHaveCount(0);
  await neighbor.reload();
  await expect(neighbor).toHaveURL(`${baseURL}/`);
  await neighbor.locator('main a[href^="/people/"]').filter({ hasText: name }).click();
  await neighbor.locator(`a[href="/households/${blueDoor}"]`).click();
  await expect(neighbor.locator('main a[href^="/people/"]').filter({ hasText: name })).toBeVisible();
});

test("a member reports and resolves a private problem in their record", async ({ page, neighbor }) => {
  await signIn(page, people.linh.email);
  // Counts persist between runs, so compare against this run's starting point.
  await page.locator('nav a[href="/me"]').click();
  const record = page.locator("section").filter({ has: page.getByRole("heading", { name: t.profile.record, exact: true }) });
  await expect(record).toBeVisible();
  const count = (label: string) => record.getByText(label, { exact: true }).locator("xpath=following-sibling::span");
  const countNow = async (label: string) => (await count(label).count()) ? Number(await count(label).textContent()) : 0;
  const reported = await countNow(t.events.issue_reported);
  const resolved = await countNow(t.events.issue_resolved);

  await page.locator('nav a[href="/"]').click();
  await page.locator(`a[href="/people/${people.marcus.id}"]`).click();
  await page.locator(`a[href="/issues/new?about=${people.marcus.id}"]`).click();
  await expect(page.locator('[name="about"]')).toHaveValue(people.marcus.id);
  await page.locator('[name="kind"]').selectOption("other");
  const description = `Test problem ${randomUUID()}`;
  await page.locator('[name="description"]').fill(description);
  await submit(page, "description");
  await expect(page).toHaveURL(/\/issues\/[0-9a-f-]+$/);
  const issueURL = page.url();
  const issuePath = new URL(issueURL).pathname;
  await expect(page.getByText(description, { exact: true })).toBeVisible();

  // One privacy smoke check complements the detailed database policy tests.
  await signIn(neighbor, people.ade.email);
  const denied = await neighbor.goto(issueURL);
  expect(denied?.status()).toBe(404);
  await expect(neighbor.getByText(description, { exact: true })).toHaveCount(0);

  const resolution = "Sorted it out together. Automated test data.";
  await page.locator('[name="resolution_note"]').fill(resolution);
  await submit(page, "resolution_note");
  await expect(page.locator('[name="resolution_note"]')).toHaveCount(0);
  await page.reload();
  await expect(page.getByText(resolution, { exact: true })).toBeVisible();
  await page.locator('nav a[href="/me"]').click();
  await expect(page.locator(`a[href="${issuePath}"]`)).toContainText(t.issues.resolved);
  await expect(count(t.events.issue_reported)).toHaveText(String(reported + 1));
  await expect(count(t.events.issue_resolved)).toHaveText(String(resolved + 1));
});
