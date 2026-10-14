// Test-only database and identities. Never imported by the application server.
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import express from 'express';
import { MessagingStore } from '../server/messaging-store.mjs';
import { messagingRouter } from '../server/messaging.mjs';
export const ids = {
  alice:'00000000-0000-4000-8000-000000000001',
  bob:'00000000-0000-4000-8000-000000000002',
  eve:'00000000-0000-4000-8000-000000000003',
  mallory:'00000000-0000-4000-8000-000000000004',
};
const clerkIds = Object.fromEntries(
  Object.keys(ids).map((name) => [name, `test-clerk-${name}`]),
);
export async function fixture(origin) {
  const db = new PGlite();
  await db.exec(await readFile(new URL('../server/migrations/001-approved-enrollments.sql',import.meta.url),'utf8'));
  await db.exec(await readFile(new URL('../server/migrations/001-messaging.sql',import.meta.url),'utf8'));
  for (const [name,id] of Object.entries(ids)) {
    await db.query(
      'INSERT INTO hub_users(id,issuer,subject,name,clerk_user_id) VALUES($1,$2,$3,$4,$5)',
      [id,'https://test.invalid',name,name[0].toUpperCase()+name.slice(1),clerkIds[name]],
    );
    if (name !== 'eve') {
      const email = `${name}@example.invalid`;
      await db.query(`INSERT INTO app_enrollments
        (email_address,email_normalized,created_by_clerk_user_id,updated_by_clerk_user_id,status_changed_by_clerk_user_id,clerk_user_id)
        VALUES($1,$1,$2,$2,$2,$3)`,[email,'test-admin',clerkIds[name]]);
    }
  }
  const pool = {async query(sql,args) { const result = await db.query(sql,args); return {...result,rowCount:result.rows.length || result.affectedRows || 0}; }};
  const store = new MessagingStore(pool);
  const app = express();
  app.use(express.json());
  app.use((req,_res,next) => {
    const name = req.get('X-Test-User') || /(?:^|; )test-user=(alice|bob|eve|mallory)(?:;|$)/.exec(req.get('Cookie') || '')?.[1];
    if (ids[name]) {
      req.authenticatedUserId = clerkIds[name];
      req.enrollmentAccess = {status:name === 'eve' ? 'not-approved' : 'joined'};
      req.session = {
        user:{id:ids[name],name:name[0].toUpperCase()+name.slice(1),clerkUserId:clerkIds[name]},
        csrf:'a'.repeat(64),
      };
    }
    next();
  });
  app.get('/api/me',(req,res) => {
    res.set('Cache-Control','private, no-store');
    if (!req.authenticatedUserId || req.enrollmentAccess?.status !== 'joined')
      return res.sendStatus(401);
    res.json({userId:req.authenticatedUserId,role:'normal',enrollmentStatus:'joined'});
  });
  app.get('/api/auth/session',(req,res) => {
    res.set('Cache-Control','private, no-store');
    if (!req.authenticatedUserId) return res.status(401).json({error:'Sign-in required'});
    if (req.enrollmentAccess?.status !== 'joined')
      return res.status(403).json({error:'Approved hub enrollment required'});
    res.json({
      configured:true,
      user:{id:req.session.user.id,name:req.session.user.name},
      csrf:req.session.csrf,
    });
  });
  app.post('/api/auth/logout',(_req,res) => res.clearCookie('test-user').sendStatus(204));
  app.use('/api/messaging',(req,_res,next) => {
    if (req.method === 'POST' && req.path.endsWith('/messages') && req.body?.body === 'PRIVATE-TEST-PENDING')
      return setTimeout(next,7000);
    next();
  });
  app.use('/api/messaging',messagingRouter(store,origin));
  app.use((error,_req,res,_next) => { console.error(error);res.status(500).json({error:'Test server error'}); });
  return {app,db,store,pool};
}
