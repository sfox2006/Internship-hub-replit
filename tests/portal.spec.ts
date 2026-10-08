import { test, expect } from "@playwright/test";
const storageKey = "intern-hub-demo:v1";
test("production API, calendars, invalid inputs and nested SPA routes", async ({
  request,
}) => {
  const health = await request.get("/api/health");
  expect(health.status()).toBe(200);
  expect(await health.json()).toEqual({ ok: true });
  for (const url of ["/schedule", "/session/56"]) {
    const r = await request.get(url);
    expect(r.status()).toBe(200);
    expect(await r.text()).toContain('<div id="root">');
  }
  const event = await request.get("/api/sessions/56/calendar.ics");
  expect(event.headers()["content-type"]).toContain("text/calendar");
  expect(await event.text()).toContain("DTSTART:20261008T133000Z");
  expect(await event.text()).toContain("DTEND:20261008T150000Z");
  const feed = await request.get("/api/calendar/demo/feed.ics");
  expect((await feed.text()).match(/BEGIN:VEVENT/g)).toHaveLength(21);
  expect(await feed.text()).not.toContain("privateNotes");
  const reading = await request.get(
    "/api/resources/globalization/reading-time.ics?start=2026-11-02T14%3A23%3A00.000Z",
  );
  expect(await reading.text()).toContain("DTEND:20261102T152300Z");
  for (const url of [
    "/api/unknown",
    "/api/sessions/missing/calendar.ics",
    "/api/resources/missing/reading-time.ics",
    "/assets/missing.js",
    "/demo-files/missing.pdf",
  ]) {
    expect((await request.get(url)).status()).toBe(404);
  }
  expect(
    (
      await request.get(
        "/api/resources/law/reading-time.ics?start=2026-10-08T13:23:00Z",
      )
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.get(
        "/api/resources/globalization/reading-time.ics?start=bad",
      )
    ).status(),
  ).toBe(400);
});
test("home, schedule filtering, calendar and direct refresh", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Good morning, Demo." }),
  ).toBeVisible();
  await expect(page.locator(".count")).toHaveText("7");
  await expect(page.locator(".prep-link")).toHaveCount(5);
  await page.getByRole("button", { name: "Close quick tour" }).click();
  await page.goto("/schedule");
  await expect(page.getByText("Showing 12 of 21")).toBeVisible();
  await page.getByLabel("Required only", { exact: true }).check();
  await page.getByRole("button", { name: "Seminar", exact: true }).click();
  await page
    .getByLabel("Policy area", { exact: true })
    .selectOption("Trade & Immigration");
  await expect(page.locator(".session-row")).toHaveCount(1);
  await page.getByRole("button", { name: "Lecture", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "No sessions match these filters" }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText("Showing 12 of 21")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "All types", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Past", exact: true }).click();
  await expect(page.locator(".session-title").first()).toHaveText(
    "Free Trade and Tariffs [DEEP DIVE]",
  );
  await page.getByRole("button", { name: "Month", exact: true }).click();
  await expect(page.locator(".calendar-day")).toHaveCount(28);
  await page.getByRole("button", { name: "Week", exact: true }).click();
  await expect(page.locator(".calendar-day")).toHaveCount(7);
  await page.getByRole("button", { name: "Subscribe to calendar" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("/session/56");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "The Jones Act [FLAGSHIP]" }),
  ).toBeVisible();
});
test("completion, bookmarks, notes and RSVP synchronize and persist", async ({
  page,
}) => {
  await page.goto("/session/56");
  await page.getByLabel("Mark complete").first().check();
  await page
    .getByRole("button", { name: "Save The Jones Act [FLAGSHIP]", exact: true })
    .click();
  await page.getByLabel("Notes", { exact: true }).fill("unsaved");
  await page.reload();
  await expect(page.getByLabel("Notes", { exact: true })).toHaveValue("");
  await page.getByLabel("Notes", { exact: true }).fill("Saved private note");
  await page.getByRole("button", { name: "Save note" }).click();
  await page.reload();
  await expect(page.getByLabel("Notes", { exact: true })).toHaveValue(
    "Saved private note",
  );
  await expect(
    page.getByRole("button", {
      name: "Unsave The Jones Act [FLAGSHIP]",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Going", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Going", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Going", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Going", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await page.goto("/readings");
  await expect(
    page.getByText("1 of 7 required readings complete"),
  ).toBeVisible();
  await expect(page.getByLabel("Mark complete").first()).toBeChecked();
  await page.goto("/requirements");
  await expect(page.getByText("3 of 8 requirements complete")).toBeVisible();
  await page.getByLabel("Weekly Report #3", { exact: true }).check();
  await page.goto("/readings");
  await expect(
    page.getByText("1 of 7 required readings complete"),
  ).toBeVisible();
  await page.goto("/saved");
  await expect(
    page.getByRole("link", { name: "The Jones Act [FLAGSHIP]", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Unsave The Jones Act [FLAGSHIP]",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your saved collection starts here" }),
  ).toBeVisible();
});
test("discussion validation, linked session, safe rendering and replies", async ({
  page,
}) => {
  await page.goto("/discussions?compose=1&session=56");
  await expect(page.getByLabel("Linked session (optional)")).toHaveValue("56");
  await expect(
    page.getByRole("button", { name: "Post discussion" }),
  ).toBeDisabled();
  await page.getByLabel("Title", { exact: true }).fill("  ");
  await page.getByLabel("Message", { exact: true }).fill("  ");
  await expect(
    page.getByRole("button", { name: "Post discussion" }),
  ).toBeDisabled();
  await page.getByLabel("Title", { exact: true }).fill("A new demo question");
  await page
    .getByLabel("Message", { exact: true })
    .fill("<script>alert(1)</script> A plain text message");
  await page.getByRole("button", { name: "Post discussion" }).click();
  await expect(
    page.getByRole("heading", { name: "A new demo question" }),
  ).toBeVisible();
  const card = page
    .locator(".card")
    .filter({
      has: page.getByRole("heading", { name: "A new demo question" }),
    });
  await expect(
    card.getByRole("button", { name: "Reply", exact: true }),
  ).toBeDisabled();
  await card.getByRole("textbox").fill("A thoughtful reply");
  await card.getByRole("button", { name: "Reply", exact: true }).click();
  await page.reload();
  await expect(
    page.getByText("A thoughtful reply", { exact: true }),
  ).toBeVisible();
  await page.goto("/session/56");
  await expect(
    page.getByRole("link", { name: "A new demo question" }),
  ).toBeVisible();
});
test("profile saves only on request, sign-out keeps records, photos survive reload", async ({
  page,
}) => {
  await page.goto("/profile");
  await page.getByLabel("First name", { exact: true }).fill("Unsaved");
  await page.reload();
  await expect(page.getByLabel("First name", { exact: true })).toHaveValue(
    "Demo",
  );
  await page.getByLabel("Website", { exact: true }).fill("javascript:alert(1)");
  await page.getByRole("button", { name: "Save Changes" }).click();
  await expect(page.getByRole("alert")).toContainText("http/https");
  await page.getByLabel("Website", { exact: true }).fill("https://example.com");
  await page.getByLabel("First name", { exact: true }).fill("Taylor");
  await page.getByRole("button", { name: "Save Changes" }).click();
  await expect(page.getByRole("status")).toHaveText("Changes saved.");
  await page.goto("/people");
  await expect(
    page.getByRole("heading", { name: "Taylor Intern" }),
  ).toBeVisible();
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aH4sAAAAASUVORK5CYII=",
    "base64",
  );
  await page.goto("/photos");
  await page
    .getByLabel("Image", { exact: true })
    .setInputFiles({ name: "pixel.png", mimeType: "image/png", buffer: png });
  await page.getByLabel("Caption (optional)").fill("A demo moment");
  await page.getByRole("button", { name: "Upload", exact: true }).click();
  await expect(page.getByRole("img", { name: "A demo moment" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("img", { name: "A demo moment" })).toBeVisible();
  await page.goto("/profile");
  await page
    .getByLabel("Change photo")
    .setInputFiles({ name: "avatar.png", mimeType: "image/png", buffer: png });
  await page.getByRole("button", { name: "Save Changes" }).click();
  await expect(page.getByRole("status")).toHaveText("Changes saved.");
  await page.reload();
  await expect(page.locator("img.avatar.large")).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("button", { name: "Enter demo" })).toBeVisible();
  await page.getByRole("button", { name: "Enter demo" }).click();
  await expect(page.getByLabel("First name", { exact: true })).toHaveValue(
    "Taylor",
  );
});
test("all reference and directory routes render and search keyboard works", async ({
  page,
}) => {
  for (const [route, heading] of [
    ["/handbook", "Handbook"],
    ["/capstone-guide", "Capstone Guide"],
    ["/dc-culture-guide", "DC Culture Guide"],
    ["/faq", "FAQ"],
    ["/emergency", "Emergency Procedures"],
    ["/teams", "Who Works on What"],
    ["/team/trade-team", "Trade & Immigration"],
    ["/person/colin", "Colin Grabow"],
    ["/announcements", "Announcements"],
    ["/how-things-work", "How Things Work"],
    ["/article/getting-started", "Getting started with your internship"],
    ["/resource/demo-file", "Demo orientation file"],
  ]) {
    await page.goto(route);
    await expect(
      page.getByRole("heading", { name: heading, exact: true }).first(),
    ).toBeVisible();
  }
  await expect(
    page.getByRole("heading", {
      name: "This file type cannot be previewed in the browser",
    }),
  ).toBeVisible();
  const search = page.getByLabel("Search the hub");
  await search.fill("Jones");
  await expect(page.getByRole("listbox")).toContainText("The Jones Act");
  await search.press("ArrowDown");
  await search.press("Enter");
  await expect(page).toHaveURL(/session\/56/);
});
test("storage failures remain visible and photos reject unsupported files", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    };
  });
  await page.goto("/session/56");
  await page.getByRole("button", { name: "Going", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Browser storage is unavailable or full",
  );
  await page.goto("/photos");
  await page
    .getByLabel("Image", { exact: true })
    .setInputFiles({
      name: "file.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("not an image"),
    });
  await expect(page.getByRole("alert").last()).toContainText(
    "JPEG, PNG, GIF, or WebP",
  );
  await expect(
    page.getByRole("button", { name: "Upload", exact: true }),
  ).toBeDisabled();
});
test("mobile drawer and pages avoid viewport overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Close quick tour" }).click();
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(page.locator(".sidebar")).toHaveClass(/open/);
  await page.getByRole("link", { name: "Schedule", exact: true }).click();
  await expect(page.locator(".sidebar")).not.toHaveClass(/open/);
  for (const route of [
    "/",
    "/session/56",
    "/readings",
    "/people",
    "/handbook",
    "/discussions",
    "/profile",
    "/schedule",
  ]) {
    await page.goto(route);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  await page.goto("/schedule");
  await page.getByRole("button", { name: "Month", exact: true }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/mobile-schedule.png",
    fullPage: true,
  });
});
