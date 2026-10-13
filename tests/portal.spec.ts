import { test, expect } from "@playwright/test";
test("production health, nested routes, thirteen calendar events and proper errors", async ({
  request,
}) => {
  expect(await (await request.get("/api/health")).json()).toEqual({ ok: true });
  for (const path of [
    "/programme",
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
    "Immigration Policy in Australia",
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
  const attendance = page.locator(".card").filter({
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
      name: "Save Tax, Spending and the Sustainability of the Budget",
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
      name: "Tax, Spending and the Sustainability of the Budget",
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
  await page
    .getByLabel("Change photo")
    .setInputFiles({
      name: "pixel.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aH4sAAAAASUVORK5CYII=",
        "base64",
      ),
    });
  await page.getByRole("button", { name: "Save Changes" }).click();
  await expect(page.getByRole("status")).toHaveText("Changes saved.");
  await page.reload();
  await expect(page.locator("img.avatar.large")).toBeVisible();
});
test("guidance routes, mobile layout and storage failure handling", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [path, title] of [
    ["/handbook", "Fellowship Handbook"],
    ["/reflection-guide", "Reflection & Viva Guide"],
    ["/reflections", "Written Reflections"],
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

test("reading links, presentation materials, full questions and submission form render", async ({
  page,
}) => {
  await page.goto("/session/ls-0416");
  await expect(
    page.getByRole("link", {
      name: "EconLib — Introduction to Public Choice",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Reflection questions" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Identify a real-world example of rent-seeking or regulatory capture.",
      { exact: false },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open fellowship submissions form ↗" }),
  ).toHaveAttribute("href", /^https:\/\/docs.google.com\/forms\//);
  await page.goto("/session/ls-0618");
  await expect(
    page.getByRole("link", {
      name: "Industrial Policy presentation",
      exact: true,
    }),
  ).toBeVisible();
  await page.goto("/readings");
  await expect(
    page.getByRole("link", {
      name: "EconLib — Introduction to Public Choice",
      exact: true,
    }),
  ).toBeVisible();
});

test("nested discussions persist and removed sections stay absent", async ({
  page,
  request,
}) => {
  await page.goto("/discussions?compose=1");
  await page.getByLabel("Title", { exact: true }).fill("Threaded discussion");
  await page.getByLabel("Message", { exact: true }).fill("Original post");
  await page.getByRole("button", { name: "Post discussion" }).click();
  await page
    .getByLabel("Reply to Threaded discussion", { exact: true })
    .fill("First comment");
  await page.getByRole("button", { name: "Reply", exact: true }).click();
  await page
    .getByRole("button", { name: "Reply to this comment", exact: true })
    .click();
  await page
    .getByLabel("Reply to comment: First comment", { exact: true })
    .fill("Nested reply");
  await page.getByRole("button", { name: "Post reply", exact: true }).click();
  const nested = page.locator(".thread-children .thread-comment");
  await expect(nested).toHaveCount(1);
  await expect(nested).toContainText("Nested reply");
  await nested
    .getByRole("button", { name: "Reply to this comment", exact: true })
    .click();
  await page
    .getByLabel("Reply to comment: Nested reply", { exact: true })
    .fill("Third level");
  await page.getByRole("button", { name: "Post reply", exact: true }).click();
  await page.reload();
  await expect(page.locator(".thread-children .thread-children")).toContainText(
    "Third level",
  );
  await page
    .getByRole("button", { name: "Hide replies (1)", exact: true })
    .first()
    .click();
  await expect(
    page.getByText("Third level", { exact: true }),
  ).not.toBeVisible();
  await page
    .getByRole("button", { name: "Show replies (1)", exact: true })
    .first()
    .click();
  await expect(page.getByText("Third level", { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(
    page.getByRole("link", { name: "Photo Library", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Application Information", exact: true }),
  ).toHaveCount(0);
  for (const path of ["/photos", "/applications", "/dc-culture-guide"])
    expect((await request.get(path)).status()).toBe(404);
});
test("written reflections display selected questions and official submission destination", async ({
  page,
}) => {
  await page.goto("/reflections?session=ls-0416");
  await expect(
    page.getByRole("heading", { name: "Written Reflections", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Identify a real-world example of rent-seeking or regulatory capture.",
      { exact: false },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open fellowship submissions form ↗" }),
  ).toHaveAttribute("href", /^https:\/\/docs.google.com\/forms\//);
  await page
    .getByLabel("Reflection session", { exact: true })
    .selectOption("ls-1022");
  await expect(
    page.getByRole("heading", {
      name: "Tax, Spending and the Sustainability of the Budget",
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Questions to be confirmed.", { exact: false }),
  ).toHaveCount(0);
  await expect(
    page.getByText("To be confirmed.", { exact: true }),
  ).toBeVisible();
});
