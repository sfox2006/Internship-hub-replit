import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { loadClientAssetPolicy } from "../server/asset-access.mjs";

const root = process.cwd();
const clientRoot = path.join(root, "dist/client");

async function expectPrivateNoStore(response: {
  headers(): Record<string, string> | Promise<Record<string, string>>;
}) {
  const cacheControl = (await response.headers())["cache-control"] ?? "";
  expect(cacheControl).toContain("private");
  expect(cacheControl).toContain("no-store");
}

test("anonymous visitors and unapproved accounts cannot read hub APIs or member bundles", async ({
  browser,
  baseURL,
}) => {
  const anonymous = await browser.newContext({
    baseURL,
    extraHTTPHeaders: { "x-hub-test-fixture": "anonymous" },
  });
  const anonymousPage = await anonymous.newPage();
  const anonymousMe = await anonymous.request.get("/api/me");
  expect(anonymousMe.status()).toBe(401);
  await expectPrivateNoStore(anonymousMe);
  const anonymousCalendar = await anonymous.request.get(
    "/api/calendar/feed.ics",
  );
  expect(anonymousCalendar.status()).toBe(401);
  await expectPrivateNoStore(anonymousCalendar);
  const anonymousAdmin = await anonymous.request.get("/admin", {
    maxRedirects: 0,
  });
  expect(anonymousAdmin.status()).toBe(302);
  await expectPrivateNoStore(anonymousAdmin);
  const signInPage = await anonymous.request.get("/sign-in");
  expect(signInPage.status()).toBe(200);
  await expectPrivateNoStore(signInPage);
  const policy = loadClientAssetPolicy(clientRoot);
  const publicJavaScript = [...policy.publicAssets].find((file) =>
    file.endsWith(".js"),
  );
  expect(publicJavaScript).toBeTruthy();
  expect(
    (await anonymous.request.get(publicJavaScript!)).status(),
  ).toBe(200);
  await anonymousPage.goto("/programme");
  await expect(anonymousPage).toHaveURL(/\/sign-in/);
  await anonymous.close();

  const unapproved = await browser.newContext({
    baseURL,
    extraHTTPHeaders: {
      "x-hub-test-fixture": "unapproved",
      "x-hub-role": "administrator",
      "x-user-id": "user_fixture_administrator",
      "x-verified-email": "already.approved@fixture.invalid",
    },
  });
  const account = await unapproved.request.get("/api/me");
  expect(account.ok()).toBe(true);
  await expectPrivateNoStore(account);
  expect((await account.json()).enrollmentStatus).toBe("not-approved");
  const deniedCalendar = await unapproved.request.get(
    "/api/calendar/feed.ics",
  );
  expect(deniedCalendar.status()).toBe(403);
  await expectPrivateNoStore(deniedCalendar);
  expect((await unapproved.request.get("/api/admin")).status()).toBe(403);
  expect((await unapproved.request.get("/admin")).status()).toBe(403);
  const deniedRoster = await unapproved.request.get("/api/admin/enrollments");
  expect(deniedRoster.status()).toBe(403);
  await expectPrivateNoStore(deniedRoster);
  const accountPage = await (await unapproved.newPage()).goto("/account");
  expect(accountPage?.status()).toBe(200);
  await expectPrivateNoStore(accountPage!);
  const unapprovedPage = await unapproved.newPage();
  const deniedPage = await unapprovedPage.goto("/programme");
  expect(deniedPage?.status()).toBe(403);
  await expectPrivateNoStore(deniedPage!);
  await expect(
    unapprovedPage.getByRole("heading", { name: "Enrollment required" }),
  ).toBeVisible();
  const memberAsset = [...policy.memberAssets].find(
    (file) => file.endsWith(".js") && !policy.publicAssets.has(file),
  );
  expect(memberAsset).toBeTruthy();
  const deniedMemberAsset = await unapproved.request.get(memberAsset!);
  expect(deniedMemberAsset.status()).toBe(403);
  await expectPrivateNoStore(deniedMemberAsset);
  await unapproved.close();
});

test("an administrator can approve, suspend and reactivate members without email or account creation", async ({
  browser,
  baseURL,
}) => {
  const candidate = await browser.newContext({
    baseURL,
    extraHTTPHeaders: {
      "x-hub-test-fixture": "candidate",
      "x-hub-role": "administrator",
      "x-user-id": "user_fixture_administrator",
      "x-verified-email": "already.approved@fixture.invalid",
    },
  });
  const notApproved = await candidate.request.get("/api/me");
  expect((await notApproved.json()).enrollmentStatus).toBe("not-approved");
  expect((await candidate.request.get("/api/calendar/feed.ics")).status()).toBe(
    403,
  );

  const administrator = await browser.newContext({
    baseURL,
    extraHTTPHeaders: {
      "x-hub-test-fixture": "administrator",
    },
  });
  const page = await administrator.newPage();
  const adminPageResponse = await page.goto("/admin");
  expect(adminPageResponse?.status()).toBe(200);
  await expectPrivateNoStore(adminPageResponse!);
  await expect(
    page.getByRole("heading", { name: "Administrator", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Administrator access verified")).toBeVisible();
  await expect(
    page.getByText("Administrator access is separate from member enrollment."),
  ).toBeVisible();
  const adminRoster = await administrator.request.get(
    "/api/admin/enrollments",
  );
  expect(adminRoster.status()).toBe(200);
  await expectPrivateNoStore(adminRoster);
  const crossOriginPreview = await administrator.request.post(
    "/api/admin/enrollments/preview",
    {
      data: { input: "candidate.member@fixture.invalid", format: "emails" },
      headers: { Origin: "https://attacker.invalid" },
    },
  );
  expect(crossOriginPreview.status()).toBe(403);
  await expectPrivateNoStore(crossOriginPreview);

  await page.getByLabel("CSV", { exact: true }).check();
  await page.getByLabel("CSV content").fill(
    [
      "email,name",
      "candidate.member@fixture.invalid,Candidate Member",
      "already.approved@fixture.invalid,Existing Member",
      "CANDIDATE.member@fixture.invalid,Duplicate",
      "not-an-email,Invalid",
    ].join("\n"),
  );
  await page.getByRole("button", { name: "Review import" }).click();
  await expect(page.getByTestId("import-summary")).toContainText(
    "1 new · 1 already on roster · 1 duplicate · 1 invalid",
  );
  await page
    .getByRole("button", { name: "Approve 1 normal member" })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "1 address approved as normal members" }),
  ).toBeVisible();
  await expect(page.getByText("No email was sent.")).toBeVisible();

  await page.getByLabel("Search roster").fill("candidate.member");
  const candidateRow = page
    .getByTestId("enrollment-roster")
    .getByRole("row")
    .filter({ hasText: "candidate.member@fixture.invalid" });
  const joinedCandidateRow = candidateRow.filter({ hasText: "Joined" });
  await expect(candidateRow).toContainText("Approved · not joined");
  await expect(candidateRow).not.toContainText("Updated by");
  await expect(candidateRow).not.toContainText("user_fixture_administrator");

  const joined = await candidate.request.get("/api/me");
  expect((await joined.json()).enrollmentStatus).toBe("joined");
  await expectPrivateNoStore(joined);
  const joinedCalendar = await candidate.request.get(
    "/api/calendar/feed.ics",
  );
  expect(joinedCalendar.status()).toBe(200);
  await expectPrivateNoStore(joinedCalendar);
  const policy = loadClientAssetPolicy(clientRoot);
  const memberAsset = [...policy.memberAssets].find(
    (file) => file.endsWith(".js") && !policy.publicAssets.has(file),
  );
  const adminAsset = [...policy.adminAssets].find(
    (file) => file.endsWith(".js") && !policy.publicAssets.has(file),
  );
  expect(memberAsset).toBeTruthy();
  expect(adminAsset).toBeTruthy();
  const joinedMemberAsset = await candidate.request.get(memberAsset!);
  expect(joinedMemberAsset.status()).toBe(200);
  await expectPrivateNoStore(joinedMemberAsset);
  const adminBundle = await administrator.request.get(adminAsset!);
  expect(adminBundle.status()).toBe(200);
  await expectPrivateNoStore(adminBundle);
  const memberPage = await (await candidate.newPage()).goto("/programme");
  expect(memberPage?.status()).toBe(200);
  await expectPrivateNoStore(memberPage!);

  await joinedCandidateRow.getByRole("button", { name: "Suspend" }).click();
  await expect(candidateRow).toContainText("Suspended");
  expect((await candidate.request.get("/api/calendar/feed.ics")).status()).toBe(
    403,
  );
  expect(
    (await (await candidate.request.get("/api/me")).json()).enrollmentStatus,
  ).toBe("suspended");

  await candidateRow.getByRole("button", { name: "Reactivate" }).click();
  await expect(candidateRow).toContainText("Joined");
  expect((await candidate.request.get("/api/calendar/feed.ics")).status()).toBe(
    200,
  );
  await candidate.close();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("heading", { name: "A place to learn. A place to belong." }))
    .toBeVisible();
  await administrator.close();
});

test("fixture data is absent from public JavaScript entry assets", async () => {
  const policy = loadClientAssetPolicy(clientRoot);
  const rawFixtures = JSON.parse(
    readFileSync(path.join(root, "shared/fixtures.json"), "utf8"),
  );
  const publicJavaScript = [...policy.publicAssets]
    .filter((file) => file.endsWith(".js"))
    .map((file) =>
      readFileSync(path.join(clientRoot, file.replace(/^\//, "")), "utf8"),
    )
    .join("\n");
  const privateMarkers = [
    rawFixtures.sessions?.[0]?.title,
    rawFixtures.people?.find((person: { email?: string }) => person.email)?.email,
  ].filter((marker: unknown): marker is string => typeof marker === "string" && marker.length > 0);
  for (const marker of privateMarkers) expect(publicJavaScript).not.toContain(marker);
});
