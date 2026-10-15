// Test-only database and Clerk-like server identities. Never imported by the application server.
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import express from 'express';
import { installMessaging } from '../server/auth.mjs';
import { MessagingStore } from '../server/messaging-store.mjs';

export const ids = {
  alice:'00000000-0000-4000-8000-000000000001',
  bob:'00000000-0000-4000-8000-000000000002',
  eve:'00000000-0000-4000-8000-000000000003',
  mallory:'00000000-0000-4000-8000-000000000004',
  unverified:'00000000-0000-4000-8000-000000000005',
  carol:'00000000-0000-4000-8000-000000000006',
};
const clerkIds = Object.fromEntries(
  Object.keys(ids).map((name) => [name, `test-clerk-${name}`]),
);
const names = {
  alice:['Alice','Fellow'],
  bob:['Bob','Fellow'],
  eve:['Eve','Unapproved'],
  mallory:['Mallory','Outsider'],
  unverified:['Unverified','Fellow'],
  carol:['Carol','Fellow'],
};
const profiles = Object.fromEntries(Object.keys(ids).map((name) => [
  name,
  {
    userId:clerkIds[name],
    sessionId:`test-session-${name}`,
    verifiedEmail:name === 'unverified' ? null : `${name}@example.invalid`,
    firstName:names[name][0],
    lastName:names[name][1],
    name:names[name].join(' '),
    enrollmentStatus:name === 'eve' ? 'not-approved' : 'joined',
  },
]));

export async function fixture(origin) {
  const db = new PGlite();
  await db.exec(await readFile(new URL('../server/migrations/001-approved-enrollments.sql',import.meta.url),'utf8'));
  await db.exec(await readFile(new URL('../server/migrations/001-messaging.sql',import.meta.url),'utf8'));
  await db.exec(await readFile(new URL('../server/migrations/002-messaging-groups.sql',import.meta.url),'utf8'));
  for (const [name,id] of Object.entries(ids)) {
    await db.query(
      'INSERT INTO hub_users(id,issuer,subject,name,clerk_user_id) VALUES($1,$2,$3,$4,$5)',
      [id,'https://test.invalid',name,names[name].join(' '),clerkIds[name]],
    );
    if (name !== 'eve') {
      const email = `${name}@example.invalid`;
      await db.query(`INSERT INTO app_enrollments
        (email_address,email_normalized,created_by_clerk_user_id,updated_by_clerk_user_id,status_changed_by_clerk_user_id,clerk_user_id)
        VALUES($1,$1,$2,$2,$2,$3)`,[email,'test-admin',clerkIds[name]]);
    }
  }
  const pool = {
    async query(sql,args) {
      const result = await db.query(sql,args);
      return {...result,rowCount:result.rows.length || result.affectedRows || 0};
    },
    on() {},
  };
  const store = new MessagingStore(pool);
  const app = express();
  app.use(express.json());
  app.use((req,_res,next) => {
    const name = req.get('X-Test-User') ||
      /(?:^|; )test-user=(alice|bob|eve|mallory|unverified|carol)(?:;|$)/.exec(req.get('Cookie') || '')?.[1];
    const profile = profiles[name];
    if (profile) {
      req.authenticatedUserId = profile.userId;
      req.authenticatedSessionId = profile.sessionId;
      req.enrollmentAccess = {status:profile.enrollmentStatus};
    }
    next();
  });
  app.get('/api/me',(req,res) => {
    res.set('Cache-Control','private, no-store');
    if (!req.authenticatedUserId || req.enrollmentAccess?.status !== 'joined')
      return res.sendStatus(401);
    const profile = Object.values(profiles).find(
      candidate => candidate.userId === req.authenticatedUserId,
    );
    res.json({
      userId:req.authenticatedUserId,
      role:'normal',
      enrollmentStatus:'joined',
      firstName:profile?.firstName || '',
      lastName:profile?.lastName || '',
      verifiedEmail:profile?.verifiedEmail || null,
      profileComplete:!!profile?.verifiedEmail && !!profile?.firstName && !!profile?.lastName,
    });
  });
  app.use('/api/messaging',(req,_res,next) => {
    if (req.method === 'POST' && req.path.endsWith('/messages') && req.body?.body === 'PRIVATE-TEST-PENDING')
      return setTimeout(next,7000);
    next();
  });
  const installForOrigin = (appOrigin) => installMessaging(app,{
      pool,
      env:{
        MESSAGING_ENABLED:'true',
        DATABASE_URL:'postgres://fixture/test',
        SESSION_SECRET: Buffer.alloc(32).toString("base64"),
        APP_URL:appOrigin,
      },
      getVerifiedIdentity:async req => profiles[
        Object.keys(clerkIds).find(name => clerkIds[name] === req.authenticatedUserId)
      ] ?? null,
      getVerifiedMember:async clerkUserId => Object.values(profiles)
        .find(profile => profile.userId === clerkUserId) ?? null,
    });
  if (origin) installForOrigin(origin);
  app.use((error,_req,res,_next) => { console.error(error);res.status(500).json({error:'Test server error'}); });
  return {app,db,store,pool,profiles,installForOrigin};
}
