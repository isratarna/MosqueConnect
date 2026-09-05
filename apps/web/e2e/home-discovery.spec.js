import { expect, test } from "@playwright/test";

const mosques = [
  {
    id: 1,
    name: "Nearest Mosque",
    address: "Dhanmondi, Dhaka",
    latitude: 23.7807,
    longitude: 90.4075,
    distance_km: 0.02,
    verification_status: "verified",
    facilities: ["Parking"],
    prayer: { dhuhr: "13:15" },
  },
  {
    id: 2,
    name: "Second Mosque",
    address: "Kalabagan, Dhaka",
    latitude: 23.782,
    longitude: 90.409,
    distance_km: 0.25,
    verification_status: "verified",
    facilities: [],
    prayer: { dhuhr: "13:30" },
  },
];

async function mockNearby(page, response) {
  await page.route("**/api/mosques/nearby?**", async (route) => {
    if (response.status) {
      await route.fulfill({
        status: response.status,
        contentType: "application/json",
        body: JSON.stringify({ message: response.message }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: response.data }),
    });
  });
}

async function authenticate(page) {
  const user = { id: 7, name: "Test Member", role: "normal_user", account_status: "active" };
  await page.addInitScript(({ cachedUser }) => {
    localStorage.setItem("mc_auth_token", "browser-test-token");
    localStorage.setItem("mc_auth_user", JSON.stringify(cachedUser));
  }, { cachedUser: user });
  await page.route("**/api/auth/me", (route) => route.fulfill({ json: { user } }));
  await page.route("**/api/notifications**", (route) => route.fulfill({ json: { data: [], unread_count: 0 } }));
  await page.route("**/api/me/followed-mosques", (route) => route.fulfill({ json: { data: [] } }));
}

test("location permission denial provides recovery actions", async ({ page, context }) => {
  await context.clearPermissions();
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Use my location" }).click();

  await expect(page.getByText(/Location unavailable/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Enter location manually" })).toBeVisible();
});

test("geolocation discovery stays consistent when the list selection changes", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"], { origin: "http://127.0.0.1:4173" });
  await context.setGeolocation({ latitude: 23.7806, longitude: 90.4074 });
  await mockNearby(page, { data: mosques });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Use my location" }).click();

  await expect(page.getByText("2 mosques nearby")).toBeVisible();
  const discovery = page.locator("#map");
  await expect(discovery).toHaveAttribute("data-selected-mosque-id", "1");
  await page.getByRole("button", { name: "Next mosque" }).click();
  await expect(discovery).toHaveAttribute("data-selected-mosque-id", "2");
  await expect(page.locator(".mc-nearby-slide.is-active")).toContainText("Second Mosque");
});

test("authenticated home shows nearby API failures and retry", async ({ page, context }) => {
  await authenticate(page);
  await context.grantPermissions(["geolocation"], { origin: "http://127.0.0.1:4173" });
  await context.setGeolocation({ latitude: 23.7806, longitude: 90.4074 });
  await mockNearby(page, { status: 503, message: "Discovery temporarily unavailable." });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(page.getByText("Could not load nearby mosques")).toBeVisible();
  await expect(page.getByText("Discovery temporarily unavailable.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
});

test("authenticated home renders the empty discovery state", async ({ page, context }) => {
  await authenticate(page);
  await context.grantPermissions(["geolocation"], { origin: "http://127.0.0.1:4173" });
  await context.setGeolocation({ latitude: 23.7806, longitude: 90.4074 });
  await mockNearby(page, { data: [] });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(page.getByText("No nearby mosques found")).toBeVisible();
  await expect(page.getByRole("link", { name: "Browse all mosques" })).toBeVisible();
});

test("authenticated user can register for and cancel an event", async ({ page }) => {
  await authenticate(page);
  await page.route("**/api/me/event-registrations", (route) => route.fulfill({ json: { data: [] } }));
  await page.route("**/api/events/44/register", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 201,
        json: { message: "You are registered for this event.", data: { id: 9, event_id: 44, user_id: 7 } },
      });
      return;
    }
    await route.fulfill({ status: 200, json: { message: "Your registration was cancelled." } });
  });
  await page.route("**/api/events/44", (route) => route.fulfill({
    json: {
      data: {
        id: 44,
        mosque_id: 3,
        title: "Community Quran Workshop",
        description: "A browser integration test event.",
        category: "Quran Program",
        event_date: "2099-09-12",
        start_time: "09:30",
        end_time: "11:00",
        location: "Main hall",
        capacity: 20,
        remaining_capacity: 20,
        is_full: false,
        registration_required: true,
        status: "published",
        mosque: { id: 3, name: "Test Mosque", address: "Dhaka", phone: "+8801700000000" },
        creator: { id: 2, name: "Mosque Admin" },
      },
    },
  }));

  await page.goto("/community/events/44", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Register" }).click();
  await expect(page.getByText("You are registered for this event.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancel registration" })).toBeVisible();

  await page.getByRole("button", { name: "Cancel registration" }).click();
  await expect(page.getByText("Your registration was cancelled.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Register" })).toBeVisible();
});
