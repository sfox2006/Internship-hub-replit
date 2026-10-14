import { test, expect } from "@playwright/test";

test("production build serves Clerk JS through the same-origin proxy without a fixture identity", async ({
  page,
  request,
}) => {
  const browserScript = page.waitForResponse((response) =>
    response.status() === 200 &&
    response.headers()["content-type"]?.includes("javascript") === true &&
    /\/api\/__clerk\/npm\/@clerk\/clerk-js@[^/]+\/dist\/clerk\.browser\.js(?:\?|$)/.test(
      response.url(),
    ),
  );
  await page.goto("/sign-in");
  const response = await browserScript;
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("javascript");
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("textbox", { name: /email/i })).toBeVisible();
  expect((await request.get("/api/me")).status()).toBe(401);
});

test("a blocked Clerk script ends in a retryable message instead of an endless spinner", async ({
  page,
}) => {
  await page.clock.install();
  await page.route("**/api/__clerk/npm/@clerk/clerk-js@6/dist/clerk.browser.js", (route) =>
    route.abort(),
  );
  await page.goto("/sign-in");
  await expect(page.getByText("Loading sign-in…")).toBeVisible();
  await page.clock.fastForward(12_000);
  await expect(
    page.getByRole("heading", { name: "Sign-in could not load" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Return to welcome" }),
  ).toBeVisible();
});
