import { test, expect, type BrowserContext } from '@playwright/test';
const base = 'http://127.0.0.1:3005';
async function login(context:BrowserContext,user:string) {
  await context.addCookies([{name:'test-user',value:user,url:base}]);
}
test('private chat updates across accounts, persists, tracks unread, and isolates outsiders',async ({browser}) => {
  test.setTimeout(60000);
  const alice = await browser.newContext();
  const bob = await browser.newContext();
  const eve = await browser.newContext();
  const mallory = await browser.newContext();
  await login(alice,'alice'); await login(bob,'bob'); await login(eve,'eve'); await login(mallory,'mallory');
  const a = await alice.newPage(); const b = await bob.newPage();
  await a.goto(`${base}/messages`); await b.goto(`${base}/messages`);
  await expect(a.getByText('Signed in through the hub as Alice Fellow')).toBeVisible();
  await expect(a.getByRole('link',{name:/sign in for messaging/i})).toHaveCount(0);
  await expect(a.getByRole('button',{name:'Sign out of messaging'})).toHaveCount(0);
  await a.getByLabel('Message a fellow').selectOption('00000000-0000-4000-8000-000000000002');
  await a.getByLabel('Message',{exact:true}).fill('Hello Bob, ready for the fellowship?');
  await a.getByRole('button',{name:'Send',exact:true}).click();
  await expect(a.getByRole('log')).toContainText('Hello Bob, ready for the fellowship?');
  await expect(b.getByLabel('Inbox').getByLabel('1 unread')).toBeVisible({timeout:15000});
  await b.getByLabel('Inbox').getByRole('button').filter({hasText:'Alice'}).click();
  await b.bringToFront();
  await expect(b.getByRole('log')).toContainText('Hello Bob, ready for the fellowship?');
  const bobDirect = b.getByLabel('Inbox').getByRole('button').filter({hasText:'Alice Fellow'});
  await expect(bobDirect).toBeVisible();
  await expect(bobDirect.getByLabel('1 unread')).toHaveCount(0,{timeout:15000});
  await b.getByLabel('Message',{exact:true}).fill('Absolutely! See you there.');
  await b.getByRole('button',{name:'Send',exact:true}).click();
  await a.bringToFront();
  await expect(a.getByRole('log')).toContainText('Absolutely! See you there.',{timeout:15000});
  await a.reload();
  await expect(a.getByRole('log')).toContainText('Hello Bob, ready for the fellowship?');
  const conversation = new URL(a.url()).searchParams.get('conversation');
  const mallorySessionResponse = await mallory.request.get(`${base}/api/auth/session`);
  expect(mallorySessionResponse.status()).toBe(200);
  const mallorySession = await mallorySessionResponse.json();
  const outsiderRead = await mallory.request.get(`${base}/api/messaging/conversations/${conversation}/messages`);
  expect(outsiderRead.status()).toBe(404);
  const outsiderSend = await mallory.request.post(`${base}/api/messaging/conversations/${conversation}/messages`,{
    data:{body:'This unrelated active member must not send here.'},
    headers:{Origin:base,'X-CSRF-Token':mallorySession.csrf},
  });
  expect(outsiderSend.status()).toBe(404);
  const unapproved = await eve.request.get(`${base}/api/messaging/conversations/${conversation}/messages`);
  expect(unapproved.status()).toBe(403);
  const e = await eve.newPage();await e.goto(`${base}/messages`);
  await expect(e.getByRole('heading',{name:'A place to learn. A place to belong.'})).toBeVisible();
  await expect(e.getByRole('log')).toHaveCount(0);
  // Text remains literal, with no HTML execution.
  await a.getByLabel('Message',{exact:true}).fill('<script>window.pwned=true</script>');
  await a.getByRole('button',{name:'Send',exact:true}).click();
  await expect(a.getByRole('log')).toContainText('<script>window.pwned=true</script>');
  expect(await a.evaluate(()=> 'pwned' in window)).toBe(false);
  await a.getByLabel('Message',{exact:true}).fill('PRIVATE-TEST-PENDING');
  await a.getByRole('button',{name:'Send',exact:true}).click();
  await alice.clearCookies({name:'test-user'});
  await expect(a.getByText(/Your verified hub sign-in or approved enrollment/)).toBeVisible({timeout:15000});
  await expect(a.getByRole('log')).toHaveCount(0);
  await pageWait(a);
  await expect(a.getByText('PRIVATE-TEST-PENDING',{exact:true})).toHaveCount(0);
  await alice.close();await bob.close();await eve.close();await mallory.close();
});
test('three-person groups show names, track unread, and deny an active outsider read, send, and read-mark access',async ({browser}) => {
  test.setTimeout(60000);
  const alice = await browser.newContext();
  const bob = await browser.newContext();
  const carol = await browser.newContext();
  const mallory = await browser.newContext();
  await login(alice,'alice');
  await login(bob,'bob');
  await login(carol,'carol');
  await login(mallory,'mallory');
  const a = await alice.newPage();
  const b = await bob.newPage();
  const c = await carol.newPage();
  await a.goto(`${base}/messages`);
  await b.goto(`${base}/messages`);
  await c.goto(`${base}/messages`);

  await expect(a.getByLabel('Message a fellow')).toContainText('Bob Fellow');
  await expect(a.getByLabel('Message a fellow')).not.toContainText('00000000');
  await a.getByLabel('Group name').fill('Writing circle');
  await a.getByLabel('Bob Fellow').check();
  await a.getByLabel('Carol Fellow').check();
  await a.getByRole('button',{name:'Create group'}).click();
  await expect(a.getByText('Private group · 3 members')).toBeVisible();
  await expect(a.getByText('Members: Alice Fellow, Bob Fellow, Carol Fellow')).toBeVisible();

  await a.getByLabel('Message',{exact:true}).fill('A private group fixture message');
  await a.getByRole('button',{name:'Send',exact:true}).click();
  await expect(b.getByLabel('Inbox').getByLabel('1 unread')).toBeVisible({timeout:15000});
  await expect(c.getByLabel('Inbox').getByLabel('1 unread')).toBeVisible({timeout:15000});
  const groupId = new URL(a.url()).searchParams.get('conversation');
  expect(groupId).toMatch(/^grp_/);
  await b.getByLabel('Inbox').getByRole('button').filter({hasText:'Writing circle'}).click();
  await expect(b.getByRole('log')).toContainText('A private group fixture message');
  await expect(b.getByRole('log')).toContainText('Alice Fellow');
  await expect(b.getByText('Members: Alice Fellow, Bob Fellow, Carol Fellow')).toBeVisible();
  const bobGroup = b.getByLabel('Inbox').getByRole('button').filter({hasText:'Writing circle'});
  await expect(bobGroup).toBeVisible();
  await expect(bobGroup.getByLabel('1 unread')).toHaveCount(0,{timeout:15000});
  await c.getByLabel('Inbox').getByRole('button').filter({hasText:'Writing circle'}).click();
  await expect(c.getByRole('log')).toContainText('A private group fixture message');
  const carolGroup = c.getByLabel('Inbox').getByRole('button').filter({hasText:'Writing circle'});
  await expect(carolGroup.getByLabel('1 unread')).toHaveCount(0,{timeout:15000});

  await b.getByLabel('Message',{exact:true}).fill('Bob confirms the group reply');
  await b.getByRole('button',{name:'Send',exact:true}).click();
  await a.bringToFront();
  await expect(a.getByRole('log')).toContainText('Bob confirms the group reply',{timeout:15000});
  await c.bringToFront();
  await expect(c.getByRole('log')).toContainText('Bob confirms the group reply',{timeout:15000});
  await expect(c.getByRole('log')).toContainText('Bob Fellow');
  await a.reload();
  await expect(a.getByRole('log')).toContainText('A private group fixture message');
  await expect(a.getByRole('log')).toContainText('Bob confirms the group reply');
  await a.setViewportSize({width:390,height:844});
  expect(await a.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await a.getByRole('button',{name:'Back to inbox'}).click();
  await a.getByLabel('Inbox').getByRole('button').filter({hasText:'Writing circle'}).click();
  await expect(a.getByRole('log')).toContainText('Bob confirms the group reply');

  const outsiderSession = await mallory.request.get(`${base}/api/auth/session`);
  expect(outsiderSession.status()).toBe(200);
  const csrf = (await outsiderSession.json()).csrf;
  const outsiderInbox = await mallory.request.get(`${base}/api/messaging/conversations`);
  expect((await outsiderInbox.json()).some((item: {id:string}) => item.id === groupId)).toBe(false);
  const outsiderDetails = await mallory.request.get(`${base}/api/messaging/groups/${groupId}`);
  expect(outsiderDetails.status()).toBe(404);
  const outsiderRead = await mallory.request.get(`${base}/api/messaging/conversations/${groupId}/messages`);
  expect(outsiderRead.status()).toBe(404);
  const outsiderSend = await mallory.request.post(`${base}/api/messaging/conversations/${groupId}/messages`,{
    data:{body:'Unrelated active member cannot send to this group.'},
    headers:{Origin:base,'X-CSRF-Token':csrf},
  });
  expect(outsiderSend.status()).toBe(404);
  const outsiderMarkRead = await mallory.request.post(`${base}/api/messaging/conversations/${groupId}/read`,{
    data:{through:'1'},
    headers:{Origin:base,'X-CSRF-Token':csrf},
  });
  expect(outsiderMarkRead.status()).toBe(404);
  await alice.close();await bob.close();await carol.close();await mallory.close();
});
test('mobile messaging fits and returns to inbox',async ({browser}) => {
  const context = await browser.newContext({viewport:{width:390,height:844}});
  await login(context,'alice');
  const page = await context.newPage(); await page.goto(`${base}/messages`);
  await page.getByLabel('Message a fellow').selectOption('00000000-0000-4000-8000-000000000002');
  await expect(page.getByLabel('Message',{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('button',{name:'Back to inbox'}).click();
  await expect(page.getByLabel('Message a fellow')).toBeVisible();
  await context.close();
});
test('switching to an unapproved identity clears prior messages and ignores an in-flight send',async ({browser}) => {
  test.setTimeout(45000);
  const context = await browser.newContext();
  await login(context,'alice');
  const page = await context.newPage();
  await page.goto(`${base}/messages`);
  await page.getByLabel('Message a fellow').selectOption('00000000-0000-4000-8000-000000000002');
  await page.getByLabel('Message',{exact:true}).fill('PRIVATE-TEST-PENDING');
  await page.getByRole('button',{name:'Send',exact:true}).click();
  await login(context,'eve');
  await expect(page.getByText(/Your verified hub sign-in or approved enrollment/)).toBeVisible({timeout:15000});
  await expect(page.getByRole('log')).toHaveCount(0);
  await page.waitForTimeout(3000);
  await expect(page.getByText('PRIVATE-TEST-PENDING',{exact:true})).toHaveCount(0);
  await expect(page.getByLabel('Message a fellow')).toHaveCount(0);
  await context.close();
});

async function pageWait(page: import('@playwright/test').Page) {
  await page.waitForTimeout(8000);
}
test('production keeps messaging disabled without configured services',async ({page,request}) => {
  await page.goto('/messages');
  await expect(page.getByText('Private messaging is disabled until its shared database is ready and an administrator activates it.',{exact:true})).toBeVisible();
  expect((await request.post('/api/messaging/conversations',{data:{peerId:'00000000-0000-4000-8000-000000000002'}})).status()).toBe(503);
});
