import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { fixture, ids } from '../../tests/messaging-fixture.mjs';
import { installMessaging } from '../../server/auth.mjs';
import express from 'express';
let context;
let server;
let base;
let conversation;
let origin;
async function messagingSession(user) {
  return fetch(`${base}/api/auth/session`,{
    headers:user ? {'X-Test-User':user} : {},
  });
}
async function api(path,user,body,extra={}) {
  let csrf = '';
  if (body !== undefined && user) {
    const response = await messagingSession(user);
    if (response.ok) csrf = (await response.json()).csrf;
  }
  return fetch(`${base}/api/messaging/${path}`,{
    method:body === undefined ? 'GET':'POST',
    headers:{
      ...(user ? {'X-Test-User':user}:{}),
      ...(body === undefined ? {} : {'Content-Type':'application/json',Origin:origin,'X-CSRF-Token':csrf}),
      ...extra,
    },
    body:body === undefined ? undefined:JSON.stringify(body),
  });
}
beforeAll(async () => {
  context = await fixture();
  server = context.app.listen(0,'127.0.0.1');
  await new Promise(resolve => server.once('listening',resolve));
  const address = server.address();
  base = `http://127.0.0.1:${typeof address === 'object' && address?.port}`;
  origin = new URL(base).origin;
  context.installForOrigin(origin);
},30000);
afterAll(async () => { await new Promise(resolve => server.close(()=>resolve())); await context.db.close(); });
describe('Verified private messaging',() => {
  it('initializes from the server-verified Clerk identity and preserves its stable database mapping',async () => {
    const response = await messagingSession('alice');
    expect(response.status).toBe(200);
    const session = await response.json();
    expect(session.configured).toBe(true);
    expect(session.user).toEqual({id:ids.alice,name:'Alice'});
    expect(session.csrf).toMatch(/^[a-f0-9]{64}$/);
    expect(session).not.toHaveProperty('email');
    expect((await fetch(`${base}/api/auth/login`,{headers:{'X-Test-User':'alice'}})).status).toBe(404);
    const mapping = await context.db.query('SELECT issuer,subject,clerk_user_id FROM hub_users WHERE id=$1',[ids.alice]);
    expect(mapping.rows[0]).toEqual({
      issuer:'https://test.invalid',
      subject:'alice',
      clerk_user_id:'test-clerk-alice',
    });
  });
  it('requires a current verified Clerk session, verified email, and active enrollment',async () => {
    expect((await messagingSession()).status).toBe(401);
    expect((await messagingSession('eve')).status).toBe(403);
    expect((await messagingSession('unverified')).status).toBe(403);
  });
  it('fails closed without auth and database configuration',async () => {
    const app = express(); installMessaging(app,{env:{}});
    const listener = app.listen(0,'127.0.0.1');
    await new Promise(resolve => listener.once('listening',resolve));
    const address = listener.address();
    const url = `http://127.0.0.1:${typeof address === 'object' && address?.port}`;
    try {
      expect(await (await fetch(`${url}/api/auth/session`)).json()).toEqual({configured:false,user:null});
      expect((await fetch(`${url}/api/messaging/conversations`)).status).toBe(503);
    } finally { listener.close(); }
  });
  it('ignores browser-supplied identity and role fields',async () => {
    expect((await api('conversations')).status).toBe(401);
    expect((await api('conversations',undefined,{peerId:ids.bob,userId:ids.alice})).status).toBe(401);
    expect((await api('conversations','eve')).status).toBe(403);
  });
  it('rejects cross-site, missing-token, and cross-session mutations',async () => {
    const aliceSession = await (await messagingSession('alice')).json();
    expect((await api('conversations','alice',{peerId:ids.bob},{Origin:'https://evil.example'})).status).toBe(403);
    expect((await api('conversations','alice',{peerId:ids.bob},{'X-CSRF-Token':''})).status).toBe(403);
    const crossSession = await fetch(`${base}/api/messaging/conversations`,{
      method:'POST',
      headers:{
        'X-Test-User':'bob',
        'Content-Type':'application/json',
        Origin:origin,
        'X-CSRF-Token':aliceSession.csrf,
      },
      body:JSON.stringify({peerId:ids.alice}),
    });
    expect(crossSession.status).toBe(403);
  });
  it('does not accept forwarded-host headers as an alternate application origin',async () => {
    const normalSession = await (await messagingSession('alice')).json();
    const spoofedSession = await fetch(`${base}/api/auth/session`,{
      headers:{
        'X-Test-User':'alice',
        'X-Forwarded-Host':'evil.example',
        'X-Forwarded-Proto':'https',
      },
    });
    expect((await spoofedSession.json()).csrf).toBe(normalSession.csrf);
    const spoofedMutation = await fetch(`${base}/api/messaging/conversations`,{
      method:'POST',
      headers:{
        'X-Test-User':'alice',
        'Content-Type':'application/json',
        Origin:'https://evil.example',
        'X-Forwarded-Host':'evil.example',
        'X-Forwarded-Proto':'https',
        'X-CSRF-Token':normalSession.csrf,
      },
      body:JSON.stringify({peerId:ids.bob}),
    });
    expect(spoofedMutation.status).toBe(403);
  });
  it('creates one conversation per pair, in either direction',async () => {
    const first = await api('conversations','alice',{peerId:ids.bob});
    expect(first.status).toBe(201); conversation = (await first.json()).id;
    expect((await (await api('conversations','bob',{peerId:ids.alice})).json()).id).toBe(conversation);
    expect((await api('conversations','alice',{peerId:ids.alice})).status).toBe(404);
  });
  it('denies outsiders history, sends, and read updates',async () => {
    expect((await messagingSession('mallory')).status).toBe(200);
    for (const [suffix,body] of [['messages',undefined],['messages',{body:'intrusion'}],['read',{through:'1'}]])
      expect((await api(`conversations/${conversation}/${suffix}`,'mallory',body)).status).toBe(404);
    expect((await api(`conversations/${conversation}/messages`,'eve')).status).toBe(403);
    expect(await context.store.history(ids.eve,conversation)).toEqual([]);
    expect(await context.store.send(ids.eve,conversation,'intrusion')).toBeNull();
  });
  it('validates messages and ignores spoofed sender identities',async () => {
    for (const body of ['', '  ', 'a'.repeat(4001),null,42]) expect((await api(`conversations/${conversation}/messages`,'alice',{body})).status).toBe(400);
    const response = await api(`conversations/${conversation}/messages`,'alice',{body:' Hello Bob ',sender_id:ids.eve});
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({body:'Hello Bob',sender_id:ids.alice});
    expect((await (await api(`conversations/${conversation}/messages`,'bob')).json())[0].body).toBe('Hello Bob');
  });
  it('tracks unread per recipient and only through the supplied message',async () => {
    expect((await (await api('conversations','bob')).json())[0].unread).toBe(1);
    const history = await (await api(`conversations/${conversation}/messages`,'bob')).json();
    await api(`conversations/${conversation}/messages`,'alice',{body:'New arrival'});
    await api(`conversations/${conversation}/read`,'bob',{through:history[0].id});
    expect((await (await api('conversations','bob')).json())[0].unread).toBe(1);
    expect((await (await api('conversations','alice')).json())[0].unread).toBe(0);
    await api(`conversations/${conversation}/read`,'eve',{through:'2'});
    expect((await (await api('conversations','bob')).json())[0].unread).toBe(1);
  });
  it('paginates a long history without losing messages or allowing read regression',async () => {
    for (let n=0;n<103;n++) await context.store.send(ids.alice,conversation,`Message ${n}`);
    const latest = await context.store.history(ids.bob,conversation);
    expect(latest).toHaveLength(100);
    const earlier = await context.store.history(ids.bob,conversation,latest[0].id);
    expect(earlier).toHaveLength(5);
    expect(new Set([...earlier,...latest].map(m=>m.id)).size).toBe(105);
    await context.store.read(ids.bob,conversation,latest.at(-1).id);
    await context.store.read(ids.bob,conversation,earlier[0].id);
    expect((await context.store.inbox(ids.bob))[0].unread).toBe(0);
    expect((await api(`conversations/${conversation}/messages?before=garbage`,'alice')).status).toBe(400);
  });
});
