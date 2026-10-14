import { test, expect, type BrowserContext } from '@playwright/test';
const base = 'http://127.0.0.1:3005';
async function login(context:BrowserContext,user:string) {
  await context.addCookies([{name:'test-user',value:user,url:base}]);
}
test('private chat updates across accounts, persists, tracks unread, and isolates outsiders',async ({browser}) => {
  const alice = await browser.newContext();
  const bob = await browser.newContext();
  const eve = await browser.newContext();
  await login(alice,'alice'); await login(bob,'bob'); await login(eve,'eve');
  const a = await alice.newPage(); const b = await bob.newPage();
  await a.goto(`${base}/messages`); await b.goto(`${base}/messages`);
  await a.getByLabel('Message a fellow').selectOption('00000000-0000-4000-8000-000000000002');
  await a.getByLabel('Message',{exact:true}).fill('Hello Bob, ready for the fellowship?');
  await a.getByRole('button',{name:'Send',exact:true}).click();
  await expect(a.getByRole('log')).toContainText('Hello Bob, ready for the fellowship?');
  await expect(b.getByLabel('Inbox').getByLabel('1 unread')).toBeVisible({timeout:15000});
  await b.getByLabel('Inbox').getByRole('button').filter({hasText:'Alice'}).click();
  await b.bringToFront();
  await expect(b.getByRole('log')).toContainText('Hello Bob, ready for the fellowship?');
  await expect(b.getByLabel('Inbox').getByLabel('1 unread')).toHaveCount(0,{timeout:15000});
  await b.getByLabel('Message',{exact:true}).fill('Absolutely! See you there.');
  await b.getByRole('button',{name:'Send',exact:true}).click();
  await a.bringToFront();
  await expect(a.getByRole('log')).toContainText('Absolutely! See you there.',{timeout:15000});
  await a.reload();
  await expect(a.getByRole('log')).toContainText('Hello Bob, ready for the fellowship?');
  const conversation = new URL(a.url()).searchParams.get('conversation');
  const outsider = await eve.request.get(`${base}/api/messaging/conversations/${conversation}/messages`);
  expect(outsider.status()).toBe(403);
  const e = await eve.newPage();await e.goto(`${base}/messages`);
  await expect(e.getByRole('heading',{name:'A place to learn. A place to belong.'})).toBeVisible();
  await expect(e.getByRole('log')).toHaveCount(0);
  // Text remains literal, with no HTML execution.
  await a.getByLabel('Message',{exact:true}).fill('<script>window.pwned=true</script>');
  await a.getByRole('button',{name:'Send',exact:true}).click();
  await expect(a.getByRole('log')).toContainText('<script>window.pwned=true</script>');
  expect(await a.evaluate(()=> 'pwned' in window)).toBe(false);
  await a.getByRole('button',{name:'Sign out of messaging'}).click();
  await expect(a.getByText('Private conversations start with sign-in')).toBeVisible();
  await expect(a.getByRole('log')).toHaveCount(0);
  await alice.close();await bob.close();await eve.close();
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
  const context = await browser.newContext();
  await login(context,'alice');
  const page = await context.newPage();
  await page.goto(`${base}/messages`);
  await page.getByLabel('Message a fellow').selectOption('00000000-0000-4000-8000-000000000002');
  await page.getByLabel('Message',{exact:true}).fill('PRIVATE-TEST-PENDING');
  await page.getByRole('button',{name:'Send',exact:true}).click();
  await login(context,'eve');
  await expect(page.getByText('Your hub access is no longer available.')).toBeVisible({timeout:15000});
  await expect(page.getByRole('log')).toHaveCount(0);
  await page.waitForTimeout(3000);
  await expect(page.getByText('PRIVATE-TEST-PENDING',{exact:true})).toHaveCount(0);
  await expect(page.getByLabel('Message a fellow')).toHaveCount(0);
  await context.close();
});
test('production keeps messaging disabled without configured services',async ({page,request}) => {
  await page.goto('/messages');
  await expect(page.getByText('Private messaging is awaiting authentication and database setup.',{exact:false})).toBeVisible();
  expect((await request.post('/api/messaging/conversations',{data:{peerId:'00000000-0000-4000-8000-000000000002'}})).status()).toBe(503);
});
