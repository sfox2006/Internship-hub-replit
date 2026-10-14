import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import pg from 'pg';
import * as oidc from 'openid-client';
import { randomBytes } from 'node:crypto';
import { MessagingStore } from './messaging-store.mjs';
import { messagingRouter } from './messaging.mjs';

export function verifiedIdentity(claims) {
  if (!claims || typeof claims.sub !== 'string' || !claims.sub || claims.email_verified !== true)
    throw new Error('A verified account is required');
  return { subject: claims.sub, name: String(claims.name || claims.preferred_username || 'Fellow').slice(0,120) };
}
export function installMessaging(app, env = process.env) {
  const configured = ['DATABASE_URL','SESSION_SECRET','OIDC_ISSUER','OIDC_CLIENT_ID','OIDC_CLIENT_SECRET','APP_URL'].every(key => !!env[key]);
  app.use('/api/auth', (_req,res,next) => { res.set('Cache-Control','no-store'); next(); });
  if (!configured) {
    app.get('/api/auth/session', (_req,res) => res.json({configured:false,user:null}));
    app.use(['/api/auth','/api/messaging'], (_req,res) => res.status(503).json({error:'Private messaging is awaiting authentication and database setup'}));
    return;
  }
  const origin = new URL(env.APP_URL).origin;
  const secure = origin.startsWith('https:');
  if ((!secure && !['localhost','127.0.0.1'].includes(new URL(origin).hostname)) || env.SESSION_SECRET.length < 32)
    throw new Error('Messaging requires HTTPS and a SESSION_SECRET of at least 32 characters');
  const pool = new pg.Pool({connectionString:env.DATABASE_URL});
  pool.on('error', () => console.error('Messaging database connection failed'));
  const PgSession = connectPgSimple(session);
  const middleware = session({
    store:new PgSession({pool,tableName:'hub_sessions'}), secret:env.SESSION_SECRET,
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
  app.get('/api/auth/session',(req,res) => res.json({configured:true,user:req.session.user ?? null,csrf:req.session.user ? req.session.csrf : undefined}));
  app.get('/api/auth/login',async (req,res) => {
    const provider = await config();
    const verifier = oidc.randomPKCECodeVerifier();
    const state = oidc.randomState();
    const nonce = oidc.randomNonce();
    req.session.login = {verifier,state,nonce,created:Date.now()};
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
      if (!login || Date.now()-login.created>10*60*1000) throw new Error('Sign-in expired');
      const provider = await config();
      const tokens = await oidc.authorizationCodeGrant(provider,new URL(req.originalUrl,origin),{
        pkceCodeVerifier:login.verifier,expectedState:login.state,expectedNonce:login.nonce,idTokenExpected:true,
      });
      const identity = verifiedIdentity(tokens.claims());
      const user = (await pool.query(`INSERT INTO hub_users(issuer,subject,name) VALUES($1,$2,$3)
        ON CONFLICT(issuer,subject) DO UPDATE SET name=excluded.name RETURNING id,name`,
        [env.OIDC_ISSUER,identity.subject,identity.name])).rows[0];
      await new Promise((resolve,reject) => req.session.regenerate(error => error ? reject(error) : resolve()));
      req.session.user = user;
      req.session.csrf = randomBytes(32).toString('hex');
      await new Promise((resolve,reject) => req.session.save(error => error ? reject(error) : resolve()));
      res.redirect('/messages');
    } catch {
      req.session.destroy(() => {});
      res.redirect('/messages?authError=1');
    }
  });
  app.post('/api/auth/logout',(req,res) => {
    if (req.get('Origin') !== origin || !req.session.csrf || req.get('X-CSRF-Token') !== req.session.csrf)
      return res.status(403).json({error:'Invalid request'});
    req.session.destroy(error => {
      if (error) return res.status(500).json({error:'Unable to sign out'});
      res.clearCookie('cis.sid',{httpOnly:true,secure,sameSite:'lax'}).sendStatus(204);
    });
  });
  app.use('/api/messaging',messagingRouter(new MessagingStore(pool),origin));
}
