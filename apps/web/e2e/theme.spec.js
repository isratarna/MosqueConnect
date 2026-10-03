import { expect, test } from "@playwright/test";

async function mockApi(page, user = null) {
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;

    if (path === "/api/auth/me") {
      await route.fulfill({ status: user ? 200 : 401, json: user ? { user } : {} });
      return;
    }

    if (path === "/api/eid-season") {
      await route.fulfill({ json: { data: null } });
      return;
    }

    if (path === "/api/super-admin/overview") {
      await route.fulfill({ json: {
        users_count: 1,
        mosques_count: 0,
        verified_mosques_count: 0,
        pending_claims_count: 0,
        active_reports_count: 0,
        pending_moderation_count: 0,
        users_by_role: { super_admin: 1 },
        recent_activity: [],
      } });
      return;
    }

    await route.fulfill({ json: { data: [], count: 0 } });
  });
}

async function authenticate(page, user) {
  await page.addInitScript(({ cachedUser }) => {
    localStorage.setItem("mc_auth_token", "theme-browser-test-token");
    localStorage.setItem("mc_auth_user", JSON.stringify(cachedUser));
  }, { cachedUser: user });
  await mockApi(page, user);
}

async function openNavigation(page) {
  const navigation = page.locator("nav.mc-navbar");
  const toggle = navigation.getByRole("button", { name: "Toggle navigation" });
  if (await toggle.isVisible() && await toggle.getAttribute("aria-expanded") === "false") {
    await toggle.click();
  }
  await expect(navigation.getByRole("group", { name: "Appearance" })).toBeVisible();
  return navigation;
}

async function expectTheme(page, resolved, selected) {
  await openNavigation(page);
  await expect(page.locator("html")).toHaveAttribute("data-bs-theme", resolved);
  await expect(page.getByRole("group", { name: "Appearance" })
    .getByRole("button", { name: selected, exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => page.evaluate(() => document.documentElement.style.colorScheme)).toBe(resolved);
}

test("guest appearance follows the system and explicit choices override it", async ({ page }) => {
  await mockApi(page);
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const navigation = await openNavigation(page);
  const appearance = navigation.getByRole("group", { name: "Appearance" });
  await expectTheme(page, "dark", "System");
  const darkBackground = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);

  await page.emulateMedia({ colorScheme: "light" });
  await expectTheme(page, "light", "System");
  const lightBackground = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(lightBackground).not.toBe(darkBackground);

  await appearance.getByRole("button", { name: "Dark", exact: true }).click();
  await expectTheme(page, "dark", "Dark");
  await appearance.getByRole("button", { name: "Light", exact: true }).click();
  await page.emulateMedia({ colorScheme: "dark" });
  await expectTheme(page, "light", "Light");

  await appearance.getByRole("button", { name: "System", exact: true }).click();
  await expectTheme(page, "dark", "System");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("mc-theme"))).toBe("system");
});

test("guest dark preference survives main navigation and a reload", async ({ page }) => {
  await mockApi(page);
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  let navigation = await openNavigation(page);
  await expect(navigation.getByRole("link", { name: "Login", exact: true })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Register", exact: true })).toBeVisible();
  await navigation.getByRole("group", { name: "Appearance" })
    .getByRole("button", { name: "Dark", exact: true }).click();

  await navigation.getByRole("link", { name: "Support", exact: true }).click();
  await expect(page).toHaveURL(/\/support$/);
  await expectTheme(page, "dark", "Dark");
  navigation = await openNavigation(page);
  await navigation.getByRole("link", { name: "Journey", exact: true }).click();
  await expect(page).toHaveURL(/\/journey$/);
  await expectTheme(page, "dark", "Dark");

  await page.reload({ waitUntil: "domcontentloaded" });
  navigation = await openNavigation(page);
  await expectTheme(page, "dark", "Dark");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("mc-theme"))).toBe("dark");
  await expect(navigation.getByRole("link", { name: "Support", exact: true })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Journey", exact: true })).toBeVisible();
});

const adminAccounts = [
  {
    user: { id: 7, name: "Theme Mosque Admin", role: "mosque_admin", status: "approved", account_status: "active" },
    link: "Mosque Dashboard",
    path: "/admin/dashboard",
    heading: "Mosque Dashboard",
  },
  {
    user: { id: 8, name: "Theme System Admin", role: "super_admin", account_status: "active" },
    link: "System Dashboard",
    path: "/super-admin/dashboard",
    heading: "System Administration",
  },
];

for (const account of adminAccounts) {
  test(`${account.user.role} keeps notifications, profile and dashboard access with dark mode`, async ({ page }) => {
    await authenticate(page, account.user);
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const navigation = await openNavigation(page);
    await expect(navigation.getByRole("button", { name: "Notifications", exact: true })).toBeVisible();
    await navigation.getByRole("group", { name: "Appearance" })
      .getByRole("button", { name: "Dark", exact: true }).click();
    await expectTheme(page, "dark", "Dark");

    await navigation.getByRole("button", { name: new RegExp(account.user.name) }).click();
    await expect(navigation.getByRole("link", { name: "My Profile", exact: true })).toBeVisible();
    await expect(navigation.getByRole("link", { name: "Followed Mosques", exact: true })).toBeVisible();
    await navigation.getByRole("link", { name: account.link, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${account.path}$`));
    await expect(page.getByRole("heading", { name: account.heading, exact: true })).toBeVisible();
    await expectTheme(page, "dark", "Dark");

    await page.reload({ waitUntil: "domcontentloaded" });
    await openNavigation(page);
    await expect(page.getByRole("heading", { name: account.heading, exact: true })).toBeVisible();
    await expectTheme(page, "dark", "Dark");
    await expect(navigation.getByRole("button", { name: "Notifications", exact: true })).toBeVisible();
  });
}
