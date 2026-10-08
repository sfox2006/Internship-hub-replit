import { test, expect } from "@playwright/test";
test("production health, nested routes, thirteen calendar events and proper errors", async ({
  request,
}) => {
  expect(await (await request.get("/api/health")).json()).toEqual({ ok: true });
  for (const path of [
    "/programme",
    "/applications",
    "/reflection-guide",
    "/session/ls-1022",
    "/schedule",
  ])
    expect((await request.get(path)).status()).toBe(200);
  const feed = await (await request.get("/api/calendar/demo/feed.ics")).text();
  expect(feed.match(/BEGIN:VEVENT/g)).toHaveLength(13);
  expect(feed).toContain("DTSTART:20260416T080000Z");
  expect(feed).toContain("DTSTART:20261022T070000Z");
  for (const path of [
    "/api/missing",
    "/assets/missing.js",
    "/api/sessions/56/calendar.ics",
  ])
    expect((await request.get(path)).status()).toBe(404);
});
test("CIS home, source preservation and Sydney schedule", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Welcome, Demo." }),
  ).toBeVisible();
  await expect(
    page.getByText("13 sessions · 6–8 p.m. Sydney time", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close quick tour" }).click();
  await page.goto("/programme");
  for (const text of [
    "non-binding expression-of-interest",
    "Chatham House Rule",
    "200–300",
    "15 minutes",
    "Josh Frydenberg",
    "Simon Bridges",
  ])
    await expect(page.locator(".prose")).toContainText(text);
  await expect(page.locator("tbody tr")).toHaveCount(13);
  await page.goto("/schedule");
  await expect(page.getByText("Showing 4 of 13")).toBeVisible();
  await expect(page.locator(".session-row").first()).toContainText(
    "6:00 PM–8:00 PM Sydney time",
  );
  await page.getByRole("button", { name: "Past", exact: true }).click();
  await expect(page.locator(".session-title").first()).toHaveText(
    "Australian immigration policy",
  );
  await page.getByRole("button", { name: "Month", exact: true }).click();
  await expect(page.locator(".calendar-day")).toHaveCount(28);
  await page.reload();
  await expect(page.getByText("Showing 4 of 13")).toBeVisible();
});
test("attendance, reflection, bookmark and note persistence are independent", async ({
  page,
}) => {
  await page.goto("/requirements");
  await page.getByLabel("Reflection · 16 April", { exact: true }).check();
  const attendance = page
    .locator(".card")
    .filter({
      has: page.getByRole("heading", { name: "Attendance · minimum 10 of 13" }),
    });
  await attendance.getByRole("checkbox").first().check();
  await page.reload();
  await expect(
    page.getByText("1 of 13 sessions recorded attended in this browser.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("1 of 16 reflections and reviews complete"),
  ).toBeVisible();
  await page.goto("/session/ls-1022");
  await expect(page.getByText("Reported length")).toBeVisible();
  await page.getByLabel("Notes", { exact: true }).fill("Unsaved");
  await page.reload();
  await expect(page.getByLabel("Notes", { exact: true })).toHaveValue("");
  await page.getByLabel("Notes", { exact: true }).fill("Own reasoning");
  await page.getByRole("button", { name: "Save note" }).click();
  await page
    .getByRole("button", {
      name: "Save Fellowship session — topic to be confirmed",
      exact: true,
    })
    .click();
  await page.reload();
  await expect(page.getByLabel("Notes", { exact: true })).toHaveValue(
    "Own reasoning",
  );
  await page.goto("/saved");
  await expect(
    page.getByRole("link", {
      name: "Fellowship session — topic to be confirmed",
      exact: true,
    }),
  ).toBeVisible();
});
test("linked discussions validate and persist without official submission", async ({
  page,
}) => {
  await page.goto("/discussions?compose=1&session=ls-1022");
  await expect(page.getByLabel("Linked session (optional)")).toHaveValue(
    "ls-1022",
  );
  await expect(
    page.getByRole("button", { name: "Post discussion" }),
  ).toBeDisabled();
  await page
    .getByLabel("Title", { exact: true })
    .fill("Institutions and liberty");
  await page
    .getByLabel("Message", { exact: true })
    .fill("My own reasoning about institutional incentives.");
  await page.getByRole("button", { name: "Post discussion" }).click();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Institutions and liberty" }),
  ).toBeVisible();
  await page.goto("/session/ls-1022");
  await expect(
    page.getByRole("link", { name: "Institutions and liberty" }),
  ).toBeVisible();
});
test("profile and uploaded images survive reload, sign-out keeps records", async ({
  page,
}) => {
  await page.goto("/profile");
  await page.getByLabel("First name", { exact: true }).fill("Taylor");
  await page.getByRole("button", { name: "Save Changes" }).click();
  await expect(page.getByRole("status")).toHaveText("Changes saved.");
  await page.reload();
  await expect(page.getByLabel("First name", { exact: true })).toHaveValue(
    "Taylor",
  );
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.getByRole("button", { name: "Enter demo" }).click();
  await expect(page.getByLabel("First name", { exact: true })).toHaveValue(
    "Taylor",
  );
  await page.goto("/photos");
  await page
    .getByLabel("Image", { exact: true })
    .setInputFiles({
      name: "pixel.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aH4sAAAAASUVORK5CYII=",
        "base64",
      ),
    });
  await page.getByLabel("Caption (optional)").fill("Fellowship demo");
  await page.getByRole("button", { name: "Upload", exact: true }).click();
  await expect(
    page.getByRole("img", { name: "Fellowship demo" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("img", { name: "Fellowship demo" }),
  ).toBeVisible();
});
test("guidance routes, mobile layout and storage failure handling", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [path, title] of [
    ["/handbook", "Fellowship Handbook"],
    ["/reflection-guide", "Reflection & Viva Guide"],
    ["/applications", "Application Information"],
    ["/people", "Fellow Directory"],
    ["/faq", "FAQ"],
    ["/programme", "Liberty & Society Student Fellowship"],
  ]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: title, exact: true }).first(),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw Error("quota");
    };
  });
  await page.goto("/session/ls-1022");
  await page.getByRole("button", { name: "Going", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("unavailable or full");
});
