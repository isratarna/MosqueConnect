/**
 * Full-stack integration tests.
 *
 * Unlike home-discovery.spec.js, nothing here is mocked: every request reaches
 * the running Laravel API and MySQL. That is deliberate — the bugs this suite
 * exists to catch were all frontend/backend contract drift (a form posting a
 * value the API's enum rejects), which a mocked test cannot see.
 *
 * Requires the Docker stack to be up and seeded. The suite skips itself when
 * the API is unreachable so the mocked suite still runs standalone.
 */
import { expect, test } from "@playwright/test";
import { api, apiIsUp, DEMO_PHONES, reseedDemoOtp, signIn, tokenFor } from "./support/live-api";

let memberToken = "";
let adminToken = "";
let live = false;

test.setTimeout(60000);

async function gotoAuthenticated(page, url) {
  const sessionResponse = page.waitForResponse((response) => (
    response.url().endsWith("/api/auth/me")
    && response.request().method() === "GET"
  ));
  await page.goto(url, { waitUntil: "domcontentloaded" });
  expect((await sessionResponse).status()).toBe(200);
}

test.beforeAll(async ({}, testInfo) => {
  testInfo.setTimeout(120000);
  live = await apiIsUp();
  if (!live) return;

  await reseedDemoOtp();
  memberToken = await tokenFor(DEMO_PHONES.member);
  adminToken = await tokenFor(DEMO_PHONES.mosqueAdmin);
}, { timeout: 120000 });

test.beforeEach(() => {
  test.skip(!live, "Live API not reachable — start the stack with `docker compose up`.");
});

test("community feed links each card to a page that actually exists", async ({ page }) => {
  await page.goto("/community", { waitUntil: "domcontentloaded" });
  await page.locator("article.mc-community-card").first().waitFor();

  const cards = await page.locator("article.mc-community-card").all();
  expect(cards.length).toBeGreaterThan(0);

  for (const card of cards) {
    const category = (await card.locator(".mc-community-card__category").innerText()).trim().toLowerCase();
    const hrefs = await card.locator("a").evaluateAll((links) => links.map((link) => link.getAttribute("href")));
    const announcementLinks = hrefs.filter((href) => href?.includes("/community/announcements/"));

    if (category.startsWith("announcement")) continue;

    // Blood requests and volunteer opportunities are not announcements; linking
    // them to /community/announcements/<id> produced a "not found" page.
    expect(announcementLinks, `${category} card must not link to an announcement page`).toHaveLength(0);
  }
});

test("an announcement card opens real announcement details", async ({ page }) => {
  await page.goto("/community?category=announcement", { waitUntil: "domcontentloaded" });
  const titleLink = page.locator("article.mc-community-card h3 a").first();
  await titleLink.waitFor();

  const href = await titleLink.getAttribute("href");
  await page.goto(href, { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: /announcement not found/i })).toHaveCount(0);
  await expect(page.locator("article h1")).toBeVisible({ timeout: 60000 });
});

test("a member can publish a blood request and it persists", async ({ page }) => {
  await signIn(page, memberToken);
  await gotoAuthenticated(page, "/blood-donation");
  await expect(page.getByText("Ayesha Rahman", { exact: true }).first()).toBeAttached();

  await page.getByRole("button", { name: /Request Blood/i }).click();

  const form = page.locator("form").filter({ has: page.locator('option[value="O+"]') });
  const marker = `E2E hospital ${Date.now()}`;
  await form.locator("select").selectOption("O+");
  await form.locator('input[type="number"]').fill("2");
  await form.locator('input[type="text"]').fill(marker);
  await form.locator('input[type="date"]').fill("2099-01-15");
  await form.locator('input[type="tel"]').fill("01711223344");

  const bloodResponse = page.waitForResponse((response) => (
    response.url().endsWith("/api/blood-requests")
    && response.request().method() === "POST"
  ));
  await form.getByRole("button", { name: /Publish|Submit|Request/i }).last().click();
  expect((await bloodResponse).status()).toBe(201);

  // The API rejected urgency:"urgent" with a 422, so this used to fail silently.
  await expect(page.getByText(/visible to the community/i)).toBeVisible({ timeout: 15000 });

  const { body } = await api("/api/blood-requests");
  expect(body.data.some((item) => item.hospital_or_location === marker)).toBe(true);
});

test("event registration persists and cannot be duplicated", async ({ page }, testInfo) => {
  const { body: list } = await api("/api/events");
  const preferredId = testInfo.project.name.includes("mobile") ? 3 : 9;
  const event = list.data.find((item) => item.id === preferredId && item.registration_required && !item.is_full)
    || list.data.find((item) => item.registration_required && !item.is_full);
  test.skip(!event, "No registerable event in the seeded data.");

  // start from a clean slate for this member
  await api(`/api/events/${event.id}/register`, { token: memberToken, method: "DELETE" });

  await signIn(page, memberToken);
  await gotoAuthenticated(page, `/community/events/${event.id}`);
  await expect(page.getByText("Ayesha Rahman", { exact: true }).first()).toBeAttached();

  const [registrationResponse] = await Promise.all([
    page.waitForResponse((response) => (
      response.url().includes(`/api/events/${event.id}/register`)
      && response.request().method() === "POST"
    )),
    page.getByRole("button", { name: /^Register$/ }).click(),
  ]);
  expect(registrationResponse.status()).toBe(201);
  await expect(page.getByRole("button", { name: /Cancel registration/i })).toBeVisible();

  const mine = await api("/api/me/event-registrations", { token: memberToken });
  expect(mine.body.data.some((item) => item.event_id === event.id)).toBe(true);

  const duplicate = await api(`/api/events/${event.id}/register`, { token: memberToken, method: "POST" });
  expect(duplicate.status).toBe(409);

  const cancellationResponse = page.waitForResponse((response) => (
    response.url().includes(`/api/events/${event.id}/register`)
    && response.request().method() === "DELETE"
  ));
  await page.getByRole("button", { name: /Cancel registration/i }).click();
  expect((await cancellationResponse).status()).toBe(200);
  await expect(page.getByRole("button", { name: /^Register$/ })).toBeVisible({ timeout: 15000 });

  const after = await api("/api/me/event-registrations", { token: memberToken });
  expect(after.body.data.some((item) => item.event_id === event.id)).toBe(false);
});

test("the API enforces authentication and role boundaries", async () => {
  const { body: mosques } = await api("/api/mosques/nearby?latitude=23.7806&longitude=90.4074&radius=20");
  const mosqueId = mosques.data[0].id;

  expect((await api("/api/me/event-registrations")).status).toBe(401);
  expect((await api(`/api/admin/mosques/${mosqueId}/dashboard`, { token: memberToken })).status).toBe(403);
  expect((await api(`/api/admin/mosques/${mosqueId}/events`, { token: memberToken, method: "POST" })).status).toBe(403);
  expect((await api("/api/events/999999")).status).toBe(404);
});

test("a mosque admin sees their dashboard backed by live data", async ({ page }) => {
  await signIn(page, adminToken);
  await gotoAuthenticated(page, "/admin/dashboard");

  await expect(page.getByRole("heading", { name: "Dashboard Overview" })).toBeVisible({ timeout: 15000 });
  await expect(page.locator(".alert-danger")).toHaveCount(0);
});

test("distance discovery respects the requested radius", async () => {
  const near = await api("/api/mosques/nearby?latitude=23.7806&longitude=90.4074&radius=2");
  const wide = await api("/api/mosques/nearby?latitude=23.7806&longitude=90.4074&radius=50");

  expect(near.body.data.every((mosque) => mosque.distance_km <= 2)).toBe(true);
  expect(wide.body.data.length).toBeGreaterThanOrEqual(near.body.data.length);

  const distances = wide.body.data.map((mosque) => mosque.distance_km);
  expect([...distances].sort((a, b) => a - b)).toEqual(distances);

  expect((await api("/api/mosques/nearby?latitude=999&longitude=90&radius=5")).status).toBe(422);
});
