import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import pg from 'pg';
import * as oidc from 'openid-client';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { MessagingStore } from './messaging-store.mjs';
import { messagingRouter } from './messaging.mjs';

export function verifiedIdentity(claims) {
  const email =
    typeof claims?.email === "string" ? claims.email.trim().toLowerCase() : "";
  if (
    !claims ||
    typeof claims.sub !== "string" ||
    !claims.sub ||
    claims.email_verified !== true ||
    !email.includes("@")
  )
    throw new Error("A verified account is required");
  return {
    subject: claims.sub,
    email,
    name: String(claims.name || claims.preferred_username || "Fellow").slice(0, 120),
  };
}

export function approvedMessagingIdentity({
  identity,
  currentClerkUserId,
  loginClerkUserId,
  verifiedClerkEmail,
  enrollmentStatus,
}) {
  const clerkEmail =
    typeof verifiedClerkEmail === "string"
      ? verifiedClerkEmail.trim().toLowerCase()
      : "";
  return Boolean(
    identity?.email &&
      currentClerkUserId &&
      currentClerkUserId === loginClerkUserId &&
      clerkEmail &&
      identity.email === clerkEmail &&
      enrollmentStatus === "joined",
  );
}

export function installMessaging(
  app,
  {
    pool: suppliedPool,
    isApprovedIdentity = async () => false,
    env = process.env,
  } = {},
) {
  const required = [
    "DATABASE_URL",
    "SESSION_SECRET",
    "OIDC_ISSUER",
    "OIDC_CLIENT_ID",
    "OIDC_CLIENT_SECRET",
    "APP_URL",
  ];
  const configured = required.every(
    (key) => typeof env[key] === "string" && env[key].trim() !== "",
  );
  const enabled = env.MESSAGING_ENABLED === "true" && configured;
  app.use('/api/auth', (_req,res,next) => { res.set('Cache-Control','no-store'); next(); });
  if (!enabled) {
    app.get('/api/auth/session', (_req,res) => res.json({configured:false,user:null}));
    app.use(['/api/auth','/api/messaging'], (_req,res) => res.status(503).json({error:'Private messaging is awaiting verified authentication and database setup'}));
    return;
  }
  const appUrl = new URL(env.APP_URL);
  const origin = appUrl.origin;
  const secure = origin.startsWith('https:');
  if (
    (!secure && !["localhost", "127.0.0.1"].includes(appUrl.hostname)) ||
    env.SESSION_SECRET.length < 32
  )
    throw new Error(
      "Messaging requires HTTPS and a SESSION_SECRET of at least 32 characters",
    );
  const issuer = new URL(env.OIDC_ISSUER);
  if (issuer.protocol !== "https:")
    throw new Error("Messaging requires an HTTPS OIDC issuer");
  const pool = suppliedPool ?? new pg.Pool({ connectionString: env.DATABASE_URL });
  pool.on('error', () => console.error('Messaging database connection failed'));
  const PgSession = connectPgSimple(session);
  const middleware = session({
    store:new PgSession({pool,tableName:'hub_sessions',createTableIfMissing:false}), secret:env.SESSION_SECRET,
    name:'cis.sid', resave:false, saveUninitialized:false,
    cookie:{httpOnly:true,secure,sameSite:'lax',maxAge:8*60*60*1000},
  });
  // Required behind Replit's TLS reverse proxy; deploy behind one trusted proxy.
  app.set('trust proxy',1);
  app.use(['/api/auth','/api/messaging'],middleware);
  let discovery;
  function config() {
    discovery ??= oidc.discovery(new URL(env.OIDC_ISSUER),env.OIDC_CLIENT_ID,env.OIDC_CLIENT_SECRET)
      .catch(error => { discovery = undefined; throw error; });
    return discovery;
  }
  app.get('/api/auth/session',(req,res) => {
    const user = req.session.user;
    const current =
      user &&
      user.clerkUserId === req.authenticatedUserId &&
      req.enrollmentAccess?.status === "joined";
    res.json({
      configured: true,
      user: current ? { id: user.id, name: user.name } : null,
      csrf: current ? req.session.csrf : undefined,
    });
  });
  app.get('/api/auth/login',async (req,res) => {
    if (!req.authenticatedUserId || req.enrollmentAccess?.status !== "joined")
      return res.status(403).json({error:'Approved hub enrollment required'});
    const provider = await config();
    const verifier = oidc.randomPKCECodeVerifier();
    const state = oidc.randomState();
    const nonce = oidc.randomNonce();
    req.session.login = {
      verifier,
      state,
      nonce,
      created: Date.now(),
      clerkUserId: req.authenticatedUserId,
    };
    const url = oidc.buildAuthorizationUrl(provider,{
      redirect_uri:`${origin}/api/auth/callback`,scope:'openid profile email',state,nonce,
      code_challenge:await oidc.calculatePKCECodeChallenge(verifier),code_challenge_method:'S256',
    });
    await new Promise((resolve,reject) => req.session.save(error => error ? reject(error) : resolve()));
    res.redirect(url.href);
  });
  app.get('/api/auth/callback',async (req,res) => {
    const login = req.session.login;
    delete req.session.login;
    try {
      if (
        !login ||
        Date.now() - login.created > 10 * 60 * 1000 ||
        login.clerkUserId !== req.authenticatedUserId ||
        req.enrollmentAccess?.status !== "joined"
      )
        throw new Error("Sign-in expired");
      const provider = await config();
      const tokens = await oidc.authorizationCodeGrant(provider,new URL(req.originalUrl,origin),{
        pkceCodeVerifier:login.verifier,expectedState:login.state,expectedNonce:login.nonce,idTokenExpected:true,
      });
      const identity = verifiedIdentity(tokens.claims());
      req.messagingLoginUserId = login.clerkUserId;
      if (!(await isApprovedIdentity(req, identity)))
        throw new Error("Approved hub enrollment required");
      const user = (await pool.query(`INSERT INTO hub_users(issuer,subject,name,clerk_user_id) VALUES($1,$2,$3,$4)
        ON CONFLICT(issuer,subject) DO UPDATE SET name=excluded.name
        WHERE hub_users.clerk_user_id=excluded.clerk_user_id
        RETURNING id,name,clerk_user_id`,
        [env.OIDC_ISSUER,identity.subject,identity.name,login.clerkUserId])).rows[0];
      if (!user) throw new Error("Messaging identity is already linked");
      await new Promise((resolve,reject) => req.session.regenerate(error => error ? reject(error) : resolve()));
      req.session.user = {
        id: user.id,
        name: user.name,
        clerkUserId: user.clerk_user_id,
      };
      req.session.csrf = randomBytes(32).toString('hex');
      await new Promise((resolve,reject) => req.session.save(error => error ? reject(error) : resolve()));
      res.redirect('/messages');
    } catch {
      req.session.destroy(() => {});
      res.redirect('/messages?authError=1');
    }
  });
  app.post('/api/auth/logout',(req,res) => {
    const token = req.get("X-CSRF-Token") || "";
    const expected = req.session?.csrf || "";
    if (
      req.get("Origin") !== origin ||
      req.session?.user?.clerkUserId !== req.authenticatedUserId ||
      !expected ||
      Buffer.byteLength(token) !== Buffer.byteLength(expected) ||
      !timingSafeEqual(Buffer.from(token), Buffer.from(expected))
    )
      return res.status(403).json({error:'Invalid request'});
    req.session.destroy(error => {
      if (error) return res.status(500).json({error:'Unable to sign out'});
      res.clearCookie('cis.sid',{httpOnly:true,secure,sameSite:'lax'}).sendStatus(204);
    });
  });
  app.use('/api/messaging',messagingRouter(new MessagingStore(pool),origin));
}
