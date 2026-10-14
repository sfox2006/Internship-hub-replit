import "dotenv/config";
import express from "express";
import { approvedMessagingIdentity, installMessaging } from "./auth.mjs";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { clerkClient, clerkMiddleware, getAuth } from "@clerk/express";
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
import { loadClientAssetPolicy } from "./asset-access.mjs";
import { createAdminEnrollmentRouter } from "./admin-enrollment-routes.mjs";
import {
  createEnrollmentService,
  createFixtureEnrollmentStore,
} from "./enrollment-service.mjs";
const root = fileURLToPath(new URL("../", import.meta.url));
const clientRoot = path.join(root, "dist/client");
const fixtures = JSON.parse(
  readFileSync(path.join(root, "shared/fixtures.json"), "utf8"),
);
const app = express();
app.disable("x-powered-by");
const authTestFixturesEnabled =
  process.env.NODE_ENV === "test" &&
  process.env.APP_AUTH_TEST_FIXTURES === "1";
const fixtureUsers = new Map([
  [
    "normal",
    {
      id: "user_fixture_normal",
      role: "normal",
      email: "joined.member@fixture.invalid",
      emailVerified: true,
    },
  ],
  [
    "administrator",
    {
      id: "user_fixture_administrator",
      role: "administrator",
      email: "administrator@fixture.invalid",
      emailVerified: true,
    },
  ],
  [
    "unapproved",
    {
      id: "user_fixture_unapproved",
      role: "normal",
      email: "unapproved.member@fixture.invalid",
      emailVerified: true,
    },
  ],
  [
    "unverified",
    {
      id: "user_fixture_unverified",
      role: "normal",
      email: "unverified.member@fixture.invalid",
      emailVerified: false,
    },
  ],
  [
    "candidate",
    {
      id: "user_fixture_candidate",
      role: "normal",
      email: "candidate.member@fixture.invalid",
      emailVerified: true,
    },
  ],
  [
    "suspended",
    {
      id: "user_fixture_suspended",
      role: "normal",
      email: "suspended.member@fixture.invalid",
      emailVerified: true,
    },
  ],
]);

// The Clerk proxy is required for published .replit.app hosts; it is a no-op
// in Development, where Clerk uses its development Frontend API directly.
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
app.use(express.json({ limit: "300kb" }));
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
const fixtureEnrollmentStore = authTestFixturesEnabled
  ? createFixtureEnrollmentStore()
  : null;
const enrollmentService = createEnrollmentService({
  pool,
  fixtureStore: fixtureEnrollmentStore,
});
function verifiedUserId(req) {
  if (authTestFixturesEnabled) {
    const fixture = fixtureUsers.get(req.get("x-hub-test-fixture"));
    return fixture?.id ?? null;
  }
  return getAuth(req).userId;
}
async function verifiedEmailForUser(userId) {
  if (authTestFixturesEnabled) {
    const fixture = [...fixtureUsers.values()].find(
      (candidate) => candidate.id === userId,
    );
    return fixture?.emailVerified ? fixture.email : null;
  }
  const user = await clerkClient.users.getUser(userId);
  const verified = user.emailAddresses.filter(
    (address) => address.verification?.status === "verified",
  );
  const primary = verified.find(
    (address) => address.id === user.primaryEmailAddressId,
  );
  return (primary ?? verified[0])?.emailAddress ?? null;
}
async function enrollmentAccess(req) {
  if (!req.enrollmentAccess) {
    req.enrollmentAccess = await enrollmentService.getAccess(
      req.authenticatedUserId,
      () => verifiedEmailForUser(req.authenticatedUserId),
    );
  }
  return req.enrollmentAccess;
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
async function requireActiveEnrollment(req, res, next) {
  try {
    const access = await enrollmentAccess(req);
    if (access.status !== "joined")
      return res.status(403).json({
        error:
          access.status === "suspended"
            ? "This account's hub access is suspended."
            : "An approved email enrollment is required.",
        code: "ENROLLMENT_REQUIRED",
        status: access.status,
      });
    return next();
  } catch {
    return res.status(503).json({ error: "Enrollment service unavailable." });
  }
}

const requireAdministratorAccess = requireAdministrator(
  (req) => ({ subject: req.authenticatedUserId }),
  administratorIds,
);

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api", (_req, res, next) => {
  res.set("Cache-Control", "private, no-store");
  next();
});
app.use("/api", requireSignedIn);
app.get("/api/me", async (req, res) => {
  try {
    const access = await enrollmentAccess(req);
    res.json({
      userId: req.authenticatedUserId,
      role: req.authenticatedRole,
      enrollmentStatus: access.status,
    });
  } catch {
    res.status(503).json({ error: "Enrollment status unavailable." });
  }
});
app.use("/api/admin", requireAdministratorAccess);
app.get("/api/admin", (req, res) =>
  res.json({
    authorized: true,
    userId: res.locals.administratorSubject,
    role: "administrator",
  }),
);
function requireSameOrigin(req, res, next) {
  const origin = req.get("origin");
  if (!origin) return res.status(403).json({ error: "Same-origin request required." });
  try {
    if (new URL(origin).host !== req.get("host"))
      return res.status(403).json({ error: "Same-origin request required." });
  } catch {
    return res.status(403).json({ error: "Same-origin request required." });
  }
  return next();
}
const publishedOrigin = "https://internship-hub-replit--samfoxprojects.replit.app";
let joinOrigin = publishedOrigin;
try {
  const configured = new URL(process.env.APP_URL);
  if (
    ["http:", "https:"].includes(configured.protocol) &&
    !configured.hostname.endsWith(".replit.dev") &&
    !["localhost", "127.0.0.1"].includes(configured.hostname)
  )
    joinOrigin = configured.origin;
} catch {}
app.use(
  "/api/admin/enrollments",
  createAdminEnrollmentRouter({
    enrollmentService,
    requireSameOrigin,
    appUrl: joinOrigin,
  }),
);
app.use("/api", requireActiveEnrollment);
installMessaging(app, {
  pool,
  isApprovedIdentity: async (req, identity) => {
    const userId = req.authenticatedUserId;
    const email = await verifiedEmailForUser(userId);
    return approvedMessagingIdentity({
      identity,
      currentClerkUserId: userId,
      loginClerkUserId: req.messagingLoginUserId,
      verifiedClerkEmail: email,
      enrollmentStatus: req.enrollmentAccess?.status,
    });
  },
});
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
const clientAssetPolicy = loadClientAssetPolicy(clientRoot);
function setPrivateNoStore(res) {
  res.set("Cache-Control", "private, no-store");
}
app.use((req, res, next) => {
  if (
    ["GET", "HEAD"].includes(req.method) &&
    req.path !== "/api" &&
    !req.path.startsWith("/api/") &&
    !publicAsset.test(req.path)
  )
    setPrivateNoStore(res);
  next();
});
async function pageAccess(req) {
  const userId = verifiedUserId(req);
  if (!userId) return { userId: null, role: null, membership: null };
  const role = await roleForUser(userId);
  const membership = await enrollmentService.getAccess(
    userId,
    () => verifiedEmailForUser(userId),
  );
  return { userId, role, membership };
}

app.use(async (req, res, next) => {
  if (!["GET", "HEAD"].includes(req.method)) return next();
  if (process.argv.includes("--dev")) {
    const devPath = req.path;
    const servesMemberSource =
      /^\/src\/pages\/(?!Account\.tsx$|Admin\.tsx$)/.test(devPath) ||
      /^\/src\/data\//.test(devPath) ||
      devPath === "/shared/fixtures.json" ||
      (/^\/@fs\//.test(devPath) && /fixtures\.json$/.test(devPath));
    const servesAdminSource = /^\/src\/pages\/Admin\.tsx$/.test(devPath);
    if (servesMemberSource || servesAdminSource) {
      setPrivateNoStore(res);
      try {
        const { userId, role, membership } = await pageAccess(req);
        if (!userId)
          return res.status(401).type("text/plain").send("Sign-in required");
        if (servesAdminSource && role !== "administrator")
          return res.status(403).type("text/plain").send("Administrator access required");
        if (
          servesMemberSource &&
          membership?.status !== "joined"
        )
          return res.status(403).type("text/plain").send("Approved enrollment required");
        return next();
      } catch {
        return res.status(503).type("text/plain").send("Account service unavailable");
      }
    }
  }

  if (
    ["GET", "HEAD"].includes(req.method) &&
    /^\/assets\/.+\.(?:js|mjs)$/i.test(req.path)
  ) {
    const publicAssetPath = clientAssetPolicy.publicAssets.has(req.path);
    const memberAssetPath = clientAssetPolicy.memberAssets.has(req.path);
    const adminAssetPath = clientAssetPolicy.adminAssets.has(req.path);
    if (publicAssetPath) return next();
    if (!memberAssetPath && !adminAssetPath)
      return res.status(404).type("text/plain").send("Not found");
    setPrivateNoStore(res);
    try {
      const { userId, role, membership } = await pageAccess(req);
      if (!userId)
        return res.status(401).type("text/plain").send("Sign-in required");
      const memberAllowed =
        memberAssetPath && membership?.status === "joined";
      const adminAllowed = adminAssetPath && role === "administrator";
      if (!memberAllowed && !adminAllowed)
        return res.status(403).type("text/plain").send("Approved access required");
      return next();
    } catch {
      return res.status(503).type("text/plain").send("Account service unavailable");
    }
  }
  return next();
});

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
    if (req.path === "/account" || req.path.startsWith("/account/"))
      return next();
    if (req.path === "/admin" || req.path.startsWith("/admin/")) {
      if (role !== "administrator")
        return res.status(403).type("text/plain").send("Administrator access required");
      return next();
    }
    const membership = await enrollmentService.getAccess(
      userId,
      () => verifiedEmailForUser(userId),
    );
    if (membership.status !== "joined")
      return res
        .status(403)
        .sendFile(path.join(clientRoot, "index.html"));
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
  app.use(express.static(clientRoot, { index: false }));
  app.use((req, res, next) => {
    if (!["GET", "HEAD"].includes(req.method)) return next();
    // Only known page routes get the SPA; asset requests and unknown URLs stay 404.
    const page =
      /^\/(?:messages|admin|sign-in(?:\/.*)?|sign-up(?:\/.*)?|account|programme|reflections|reflection-guide|schedule|requirements|readings|handbook|capstone-guide|faq|emergency|teams|people|announcements|discussions|saved|profile|search|how-things-work|session\/[^/.]+|resource\/[^/.]+|team\/[^/.]+|person\/[^/.]+|article\/[^/.]+)?\/?$/;
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
