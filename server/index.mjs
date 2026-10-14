import "dotenv/config";
import express from "express";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { clerkMiddleware, getAuth } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import { Pool } from "pg";
import { calendar, readingEvent } from "./calendar.mjs";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware.mjs";
import { requireAdministrator } from "./admin-access.mjs";
import { ensureNormalAccount, listAdministratorIds } from "./account-roles.mjs";
const root = fileURLToPath(new URL("../", import.meta.url));
const fixtures = JSON.parse(
  readFileSync(path.join(root, "shared/fixtures.json"), "utf8"),
);
const app = express();
app.disable("x-powered-by");
const authTestFixturesEnabled =
  process.env.NODE_ENV === "test" &&
  process.env.APP_AUTH_TEST_FIXTURES === "1";
const fixtureUsers = new Map([
  ["normal", { id: "user_fixture_normal", role: "normal" }],
  ["administrator", { id: "user_fixture_administrator", role: "administrator" }],
]);

// The Clerk proxy is required for published .replit.app hosts; it is a no-op
// in Development, where Clerk uses its development Frontend API directly.
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
if (!authTestFixturesEnabled)
  app.use(
    clerkMiddleware((req) => ({
      publishableKey: publishableKeyFromHost(
        getClerkProxyHost(req) ?? "",
        process.env.CLERK_PUBLISHABLE_KEY,
      ),
    })),
  );

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
function verifiedUserId(req) {
  if (authTestFixturesEnabled) {
    const fixture = fixtureUsers.get(req.get("x-hub-test-fixture"));
    return fixture?.id ?? null;
  }
  return getAuth(req).userId;
}
async function roleForUser(userId) {
  if (authTestFixturesEnabled) {
    const fixture = [...fixtureUsers.values()].find(
      (candidate) => candidate.id === userId,
    );
    if (!fixture) throw new Error("Unknown test identity");
    return fixture.role;
  }
  return ensureNormalAccount(pool, userId);
}
async function administratorIds() {
  if (authTestFixturesEnabled)
    return [...fixtureUsers.values()]
      .filter((fixture) => fixture.role === "administrator")
      .map((fixture) => fixture.id);
  return listAdministratorIds(pool);
}
async function requireSignedIn(req, res, next) {
  try {
    const userId = verifiedUserId(req);
    if (typeof userId !== "string" || !userId)
      return res.status(401).json({ error: "Sign-in required" });
    req.authenticatedUserId = userId;
    req.authenticatedRole = await roleForUser(userId);
    return next();
  } catch {
    return res.status(503).json({ error: "Account service unavailable" });
  }
}

const requireAdministratorAccess = requireAdministrator(
  (req) => ({ subject: req.authenticatedUserId }),
  administratorIds,
);

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api", requireSignedIn);
app.use("/api/admin", requireAdministratorAccess);
app.get("/api/me", (req, res) =>
  res.json({ userId: req.authenticatedUserId, role: req.authenticatedRole }),
);
app.get("/api/admin", (req, res) =>
  res.json({
    authorized: true,
    userId: res.locals.administratorSubject,
    role: "administrator",
  }),
);
app.get("/api/config", (_req, res) => {
  let origin = null;
  try {
    const u = new URL(process.env.APP_URL);
    if (["http:", "https:"].includes(u.protocol)) origin = u.origin;
  } catch {}
  res.json({ appUrl: origin });
});
function sendCalendar(res, events, filename) {
  res.type("text/calendar; charset=utf-8");
  if (filename) res.attachment(filename);
  res.send(calendar(events));
}
app.get("/api/calendar/feed.ics", (_req, res) =>
  sendCalendar(res, fixtures.sessions),
);
app.get("/api/sessions/:id/calendar.ics", (req, res) => {
  const session = fixtures.sessions.find((s) => s.id === req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found" });
  sendCalendar(res, [session], `session-${session.id}.ics`);
});
app.get("/api/resources/:id/reading-time.ics", (req, res) => {
  const resource = fixtures.resources.find((r) => r.id === req.params.id);
  if (!resource) return res.status(404).json({ error: "Resource not found" });
  const event = readingEvent(resource, req.query.start);
  if (!event)
    return res.status(400).json({
      error: "A valid UTC timestamp and positive reading duration are required",
    });
  sendCalendar(res, [event], `reading-${resource.id}.ics`);
});
app.use("/api", (_req, res) =>
  res.status(404).json({ error: "API route not found" }),
);

const authPage = /^\/(?:sign-in|sign-up)(?:\/|$)/;
const publicAsset =
  /^\/(?:@|src\/|node_modules\/)|\.(?:js|mjs|css|svg|png|jpe?g|gif|webp|woff2?|ico|map)$/i;
app.use(async (req, res, next) => {
  if (
    !["GET", "HEAD"].includes(req.method) ||
    req.path.startsWith("/api/") ||
    req.path === "/" ||
    authPage.test(req.path) ||
    publicAsset.test(req.path)
  )
    return next();

  let userId;
  try {
    userId = verifiedUserId(req);
  } catch {
    return res.redirect(302, `/sign-in?redirect_url=${encodeURIComponent(req.originalUrl)}`);
  }
  if (!userId)
    return res.redirect(
      302,
      `/sign-in?redirect_url=${encodeURIComponent(req.originalUrl)}`,
    );

  try {
    const role = await roleForUser(userId);
    if (
      (req.path === "/admin" || req.path.startsWith("/admin/")) &&
      role !== "administrator"
    )
      return res.status(403).type("text/plain").send("Administrator access required");
    return next();
  } catch {
    return res
      .status(503)
      .type("text/plain")
      .send("Account service unavailable");
  }
});
if (process.argv.includes("--dev")) {
  const { createServer } = await import("vite");
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.join(root, "dist/client"), { index: false }));
  app.use((req, res, next) => {
    if (!["GET", "HEAD"].includes(req.method)) return next();
    // Only known page routes get the SPA; asset requests and unknown URLs stay 404.
    const page =
      /^\/(?:admin|sign-in(?:\/.*)?|sign-up(?:\/.*)?|account|programme|reflections|reflection-guide|schedule|requirements|readings|handbook|capstone-guide|faq|emergency|teams|people|announcements|discussions|saved|profile|search|how-things-work|session\/[^/.]+|resource\/[^/.]+|team\/[^/.]+|person\/[^/.]+|article\/[^/.]+)?\/?$/;
    if (page.test(req.path))
      return res.sendFile(path.join(root, "dist/client/index.html"));
    next();
  });
}
app.use((_req, res) => res.status(404).type("text/plain").send("Not found"));
app.use((error, _req, res, _next) => {
  console.error(error.message);
  res.status(500).json({ error: "Server error" });
});
const port = Number(process.env.PORT || 3000);
app.listen(port, "0.0.0.0", () =>
  console.log(`CIS Fellowship listening on port ${port}`),
);
