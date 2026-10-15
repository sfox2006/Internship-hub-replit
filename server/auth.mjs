import { createHmac, timingSafeEqual } from "node:crypto";
import pg from "pg";
import { MessagingStore } from "./messaging-store.mjs";
import { messagingRouter } from "./messaging.mjs";

function csrfFor(secret, userId, sessionId, origin) {
  return createHmac("sha256", secret)
    .update(`${userId}\0${sessionId}\0${origin}`)
    .digest("hex");
}

function validCsrf(token, expected) {
  if (typeof token !== "string" || !expected) return false;
  const supplied = Buffer.from(token);
  const known = Buffer.from(expected);
  return supplied.length === known.length && timingSafeEqual(supplied, known);
}

export function installMessaging(
  app,
  {
    pool: suppliedPool,
    getVerifiedIdentity = async () => null,
    env = process.env,
  } = {},
) {
  app.use("/api/auth", (_req, res, next) => {
    res.set("Cache-Control", "private, no-store");
    next();
  });

  const required = ["DATABASE_URL", "SESSION_SECRET", "APP_URL"];
  const configured = required.every(
    (key) => typeof env[key] === "string" && env[key].trim() !== "",
  );
  const enabled = env.MESSAGING_ENABLED === "true" && configured;

  if (!enabled) {
    app.get("/api/auth/session", (_req, res) =>
      res.json({ configured: false, user: null }),
    );
    app.use(["/api/auth", "/api/messaging"], (_req, res) =>
      res.status(503).json({
        error: "Private messaging is awaiting database readiness and activation",
      }),
    );
    return;
  }

  let appUrl;
  try {
    appUrl = new URL(env.APP_URL);
  } catch {
    throw new Error("Messaging requires a valid APP_URL");
  }
  if (
    appUrl.pathname !== "/" ||
    appUrl.search ||
    appUrl.hash ||
    (appUrl.protocol !== "https:" &&
      !(
        appUrl.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(appUrl.hostname)
      )) ||
    env.SESSION_SECRET.length < 32
  )
    throw new Error(
      "Messaging requires an HTTPS origin and a SESSION_SECRET of at least 32 characters",
    );

  if (typeof getVerifiedIdentity !== "function")
    throw new Error("Messaging requires the server-verified Clerk identity");

  const origin = appUrl.origin;
  const pool = suppliedPool ?? new pg.Pool({ connectionString: env.DATABASE_URL });
  pool.on?.("error", () => console.error("Messaging database connection failed"));
  const store = new MessagingStore(pool);

  async function resolveRequestIdentity(req) {
    if (
      typeof req.authenticatedUserId !== "string" ||
      !req.authenticatedUserId ||
      typeof req.authenticatedSessionId !== "string" ||
      !req.authenticatedSessionId
    )
      return { status: 401 };

    const identity = await getVerifiedIdentity(req);
    if (
      !identity ||
      identity.userId !== req.authenticatedUserId ||
      identity.sessionId !== req.authenticatedSessionId
    )
      return { status: 401 };

    if (
      typeof identity.verifiedEmail !== "string" ||
      !identity.verifiedEmail.trim() ||
      identity.enrollmentStatus !== "joined"
    )
      return { status: 403 };

    const user = await store.ensureUser({
      clerkUserId: identity.userId,
      name: identity.name,
    });
    return {
      status: 200,
      identity,
      user,
      csrf: csrfFor(
        env.SESSION_SECRET,
        identity.userId,
        identity.sessionId,
        origin,
      ),
      origin,
    };
  }

  app.get("/api/auth/session", async (req, res) => {
    try {
      const current = await resolveRequestIdentity(req);
      if (current.status !== 200)
        return res.status(current.status).json({
          error:
            current.status === 401
              ? "Verified hub sign-in required"
              : "Active approved hub enrollment required",
        });
      return res.json({
        configured: true,
        user: { id: current.user.id, name: current.user.name },
        csrf: current.csrf,
      });
    } catch {
      return res
        .status(503)
        .json({ error: "Messaging identity verification is unavailable" });
    }
  });

  app.use("/api/auth", (_req, res) =>
    res.status(404).json({ error: "Messaging uses the existing hub sign-in" }),
  );

  app.use("/api/messaging", async (req, res, next) => {
    res.set("Cache-Control", "private, no-store");
    try {
      const current = await resolveRequestIdentity(req);
      if (current.status !== 200)
        return res.status(current.status).json({
          error:
            current.status === 401
              ? "Verified hub sign-in required"
              : "Active approved hub enrollment required",
        });
      req.messagingUser = current.user;
      req.messagingClerkUserId = current.identity.userId;
      req.messagingCsrf = current.csrf;
      return next();
    } catch {
      return res
        .status(503)
        .json({ error: "Messaging identity verification is unavailable" });
    }
  });
  app.use(
    "/api/messaging",
    messagingRouter(store, {
      origin,
      isValidCsrf: (token, expected) => validCsrf(token, expected),
    }),
  );
}
