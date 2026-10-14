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
};
export async function fixture(origin) {
  const db = new PGlite();
  await db.exec(await readFile(new URL('../server/migrations/001-messaging.sql',import.meta.url),'utf8'));
  for (const [name,id] of Object.entries(ids)) await db.query('INSERT INTO hub_users(id,issuer,subject,name) VALUES($1,$2,$3,$4)',[id,'https://test.invalid',name,name[0].toUpperCase()+name.slice(1)]);
  const pool = {async query(sql,args) { const result = await db.query(sql,args); return {...result,rowCount:result.rows.length || result.affectedRows || 0}; }};
  const store = new MessagingStore(pool);
  const app = express();
  app.use(express.json());
  app.use((req,_res,next) => {
    const name = req.get('X-Test-User') || /(?:^|; )test-user=(alice|bob|eve)(?:;|$)/.exec(req.get('Cookie') || '')?.[1];
    if (ids[name]) req.session = {user:{id:ids[name],name:name[0].toUpperCase()+name.slice(1)},csrf:'a'.repeat(64)};
    next();
  });
  app.get('/api/auth/session',(req,res) => res.json({configured:true,user:req.session?.user ?? null,csrf:req.session?.csrf}));
  app.post('/api/auth/logout',(_req,res) => res.clearCookie('test-user').sendStatus(204));
  app.use('/api/messaging',messagingRouter(store,origin));
  app.use((error,_req,res,_next) => { console.error(error);res.status(500).json({error:'Test server error'}); });
  return {app,db,store,pool};
}
