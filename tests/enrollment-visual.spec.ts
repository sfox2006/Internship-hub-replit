import { expect, test } from "@playwright/test";
import { mkdirSync, statSync } from "node:fs";
import path from "node:path";

const artifactDirectory = path.join(process.cwd(), "generated-artifacts");

test("capture isolated administrator roster and import-review screens", async ({
  browser,
  baseURL,
}) => {
  mkdirSync(artifactDirectory, { recursive: true });
  const administrator = await browser.newContext({
    baseURL,
    viewport: { width: 1440, height: 1000 },
    extraHTTPHeaders: { "x-hub-test-fixture": "administrator" },
  });
  const page = await administrator.newPage();
  const response = await page.goto("/admin");
  expect(response?.status()).toBe(200);
  const joiningInfoResponse = await administrator.request.get(
    "/api/admin/enrollments/join-info",
  );
  expect(joiningInfoResponse.status()).toBe(200);
  const joiningInfo = await joiningInfoResponse.json();
  expect(joiningInfo.instructions).toContain(
    "Create an account using the email address approved for you",
  );
  expect(joiningInfo.instructions).toContain("verify that email");
  expect(joiningInfo.instructions).not.toContain("provider verification");
  await expect(
    page.getByRole("heading", { name: "Administrator", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Approve ordinary members")).toBeVisible();
  await expect(
    page.getByTestId("enrollment-roster").getByText(
      "already.approved@fixture.invalid",
    ),
  ).toBeVisible();
  const rosterTable = page.getByTestId("enrollment-roster");
  await expect(
    rosterTable.getByRole("cell", { name: "Joined", exact: true }).first(),
  ).toBeVisible();
  await expect(
    rosterTable.getByRole("cell", { name: "Suspended", exact: true }).first(),
  ).toBeVisible();
  await expect(rosterTable).not.toContainText("Updated by");
  await expect(rosterTable).not.toContainText("user_fixture_administrator");
  await expect(page.getByText(/Approved people must sign in with the email/))
    .toBeVisible();
  await expect(
    page.getByText(/People create an account using their approved email address and verify it/),
  ).toBeVisible();
  await page.addStyleTag({
    content: "html { scroll-behavior: auto !important; }",
  });

  const rosterPath = path.join(
    artifactDirectory,
    "admin-enrolments-roster.png",
  );
  await page
    .getByRole("heading", { name: "Approved email roster" })
    .evaluate((heading) =>
      heading.scrollIntoView({ block: "start", behavior: "instant" }),
    );
  await page.screenshot({
    path: rosterPath,
    animations: "disabled",
    caret: "hide",
  });

  await page.getByLabel("CSV", { exact: true }).check();
  await page.getByLabel("CSV content").fill(
    [
      "email,name",
      "visual.new@fixture.invalid,Visual Example",
      "already.approved@fixture.invalid,Existing Example",
      "VISUAL.NEW@fixture.invalid,Duplicate Example",
      "not-an-email,Invalid Example",
    ].join("\n"),
  );
  await page.getByRole("button", { name: "Review import" }).click();
  await expect(page.getByTestId("import-summary")).toContainText(
    "1 new · 1 already on roster · 1 duplicate · 1 invalid",
  );
  await expect(
    page.getByRole("button", {
      name: "Approve 1 normal member",
    }),
  ).toBeVisible();

  const reviewPath = path.join(
    artifactDirectory,
    "admin-enrolments-import-review.png",
  );
  await page
    .getByRole("heading", { name: "Review before approval" })
    .evaluate((heading) =>
      heading.scrollIntoView({ block: "start", behavior: "instant" }),
    );
  await page.screenshot({
    path: reviewPath,
    animations: "disabled",
    caret: "hide",
  });

  await page.getByLabel("CSV content").fill(
    [
      "email,name",
      "visual.one@fixture.invalid,First Member",
      "visual.two@fixture.invalid,Second Member",
    ].join("\n"),
  );
  await page.getByRole("button", { name: "Review import" }).click();
  await expect(
    page.getByRole("button", { name: "Approve 2 normal members" }),
  ).toBeVisible();

  expect(statSync(rosterPath).size).toBeGreaterThan(0);
  expect(statSync(reviewPath).size).toBeGreaterThan(0);
  await administrator.close();
});
