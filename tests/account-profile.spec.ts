import { expect, test } from "@playwright/test";

test("a verified normal account must complete and can later edit its names without losing access", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    baseURL,
    extraHTTPHeaders: { "x-hub-test-fixture": "profile-incomplete" },
  });
  const accountResponse = await context.request.get("/api/me");
  expect(accountResponse.status()).toBe(200);
  const initial = await accountResponse.json();
  expect(initial).toMatchObject({
    userId: "user_fixture_profile_incomplete",
    role: "normal",
    enrollmentStatus: "joined",
    verifiedEmail: "profile.incomplete@fixture.invalid",
    profileComplete: false,
  });

  const memberApi = await context.request.get("/api/calendar/feed.ics");
  expect(memberApi.status()).toBe(403);
  expect((await memberApi.json()).code).toBe("PROFILE_REQUIRED");
  const page = await context.newPage();
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Complete your account" }),
  ).toBeVisible();
  await expect(page.getByLabel("Verified email")).toHaveValue(
    "profile.incomplete@fixture.invalid",
  );
  await page.getByLabel("First name").fill("  Taylor ");
  await page.getByLabel("Last name").fill(" Fellow ");
  await page.getByRole("button", { name: "Save name" }).click();
  await expect(page.getByRole("link", { name: "This Week" })).toBeVisible();

  const completed = await (await context.request.get("/api/me")).json();
  expect(completed).toMatchObject({
    userId: initial.userId,
    role: "normal",
    enrollmentStatus: "joined",
    firstName: "Taylor",
    lastName: "Fellow",
    profileComplete: true,
  });
  expect((await context.request.get("/api/calendar/feed.ics")).status()).toBe(
    200,
  );

  await page.goto("/account");
  await page.getByLabel("First name").fill("Jordan");
  await page.getByLabel("Last name").fill("Member");
  await page.getByRole("button", { name: "Save name" }).click();
  await expect(page.getByRole("status")).toContainText("Your name was saved.");

  const exactOrigin = baseURL!;
  const tamperedUpdate = await context.request.put("/api/account/profile", {
    headers: { Origin: exactOrigin },
    data: {
      firstName: "Jordan",
      lastName: "Member",
      role: "administrator",
      userId: "user_fixture_administrator",
      email: "attacker@fixture.invalid",
    },
  });
  expect(tamperedUpdate.status()).toBe(200);
  const afterEdit = await (await context.request.get("/api/me")).json();
  expect(afterEdit).toMatchObject({
    userId: initial.userId,
    role: "normal",
    enrollmentStatus: "joined",
    firstName: "Jordan",
    lastName: "Member",
    verifiedEmail: "profile.incomplete@fixture.invalid",
  });
  await context.close();
});

test("account names reject invalid values and profile updates require the configured origin", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    baseURL,
    extraHTTPHeaders: { "x-hub-test-fixture": "normal" },
  });
  const invalid = await context.request.put("/api/account/profile", {
    headers: { Origin: baseURL! },
    data: { firstName: " ", lastName: "Member" },
  });
  expect(invalid.status()).toBe(400);
  const wrongOrigin = await context.request.put("/api/account/profile", {
    headers: { Origin: "https://attacker.invalid" },
    data: { firstName: "Jordan", lastName: "Member" },
  });
  expect(wrongOrigin.status()).toBe(403);
  await context.close();
});

test("Profile page edits update the verified account name and preserve browser-local member fields", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    baseURL,
    extraHTTPHeaders: { "x-hub-test-fixture": "normal" },
  });
  const page = await context.newPage();
  await page.goto("/profile");
  await expect(page.getByLabel("First name", { exact: true })).toHaveValue(
    "Joined",
  );
  await expect(page.getByLabel("Last name", { exact: true })).toHaveValue(
    "Member",
  );
  await page.getByLabel("First name", { exact: true }).fill("Harper");
  await page.getByLabel("Last name", { exact: true }).fill("Profile");
  await page.getByLabel("School").fill("Fixture school");
  await page.getByRole("button", { name: "Save Changes" }).click();
  await expect(page.getByRole("status")).toContainText("Changes saved.");

  expect(await (await context.request.get("/api/me")).json()).toMatchObject({
    userId: "user_fixture_normal",
    role: "normal",
    firstName: "Harper",
    lastName: "Profile",
  });
  await page.reload();
  await expect(page.getByLabel("First name", { exact: true })).toHaveValue(
    "Harper",
  );
  await expect(page.getByLabel("Last name", { exact: true })).toHaveValue(
    "Profile",
  );
  await expect(page.getByLabel("School")).toHaveValue("Fixture school");
  await context.close();
});
