import fs from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { admin, USER_FILE } from './admin';

// Main user flows, end to end: a real browser (phone-sized) against a production build and the real database,
// logged in as a throwaway account that global-teardown deletes afterwards.

const userId = () => JSON.parse(fs.readFileSync(USER_FILE, 'utf8')).id as string;
// Same suffix for every test in a run (even if Playwright restarts the file after a failure),
// and different per browser engine, because both engines share the one test account.
const run = () => `${userId().slice(0, 6)}${test.info().project.name === 'iphone' ? 'i' : 'a'}`;

async function addItem(page: Page, name: string, when: '2 days' | '1 week' | 'guess' = '2 days') {
  await page.goto('/add');
  await page.getByLabel('Name').fill(name);
  if (when !== 'guess') await page.getByRole('button', { name: when, exact: true }).click();
  await page.getByRole('button', { name: 'Add to fridge' }).click();
  await page.waitForURL((url) => url.pathname === '/');
}

const card = (page: Page, name: string) => page.locator('.card', { hasText: name });

test('signed-out visitors land on the welcome page', async ({ browser }) => {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page).toHaveURL(/\/welcome$/);
  await context.close();
});

test('adding food puts it on the fridge in the right colour group', async ({ page }) => {
  await addItem(page, `Lapte ${run()}`, '2 days');
  const soon = page.locator('section', { has: page.getByRole('heading', { name: /Use soon/ }) });
  await expect(soon.getByText(`Lapte ${run()}`)).toBeVisible();

  await addItem(page, `Mere ${run()}`, '1 week');
  const fresh = page.locator('section', { has: page.getByRole('heading', { name: /Fresh/ }) });
  await expect(fresh.getByText(`Mere ${run()}`)).toBeVisible();
});

test('a guessed date comes from the shelf-life table and is marked as estimated', async ({ page }) => {
  await page.goto('/add');
  await page.getByLabel('Name').fill(`Iaurt ${run()}`);
  // Dairy in the fridge = 7 days in supabase/seed.sql
  await expect(page.getByRole('button', { name: 'Guess for me (~7 d)' })).toBeVisible();
  await expect(page.getByText('estimated', { exact: false }).first()).toBeVisible();
});

test('"Used it" removes the item and counts it in the stats', async ({ page }) => {
  await page.goto('/stats');
  const foodSaved = page.locator('.card', { hasText: 'Food saved' }).locator('.font-pixel');
  const before = Number(await foodSaved.textContent());

  await page.goto('/');
  const saved = page.waitForResponse((r) => r.request().method() === 'POST' && r.ok());
  await card(page, `Lapte ${run()}`).getByRole('button', { name: 'Used it' }).click();
  await saved; // the change reached the server before we leave the page
  await expect(page.getByRole('status').filter({ hasText: 'saved from the bin' })).toBeVisible();
  await expect(card(page, `Lapte ${run()}`)).toHaveCount(0);

  await page.goto('/stats');
  await expect(foodSaved).toHaveText(String(before + 1));
});

test('offline: tossing food is kept on the phone and synced when the internet is back', async ({ page, context }) => {
  await addItem(page, `Paine ${run()}`, '2 days');
  // Let the service worker take control and keep a copy of the fridge page.
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  await context.setOffline(true);
  await card(page, `Paine ${run()}`).getByRole('button', { name: 'Tossed' }).click();
  await expect(card(page, `Paine ${run()}`)).toHaveCount(0);
  await expect(page.getByRole('status').filter({ hasText: "You're offline" })).toContainText('1 change');

  await context.setOffline(false);
  await expect(page.getByRole('status').filter({ hasText: /offline|sync/ })).toHaveCount(0, { timeout: 15_000 });

  const { data } = await admin()
    .from('fridge_items')
    .select('status, closed_at')
    .eq('user_id', userId())
    .eq('name', `Paine ${run()}`)
    .single();
  expect(data?.status).toBe('wasted');
  expect(data?.closed_at).not.toBeNull();
});

test('offline: pages open from the saved copy after a single visit, like on a phone', async ({ page, context }) => {
  // One normal visit — no reload — then the connection drops (this is what failed on a real iPhone at first).
  await page.goto('/');
  await expect
    .poll(() => page.evaluate(async () => (await caches.open('frigo-pages-v2')).keys().then((k) => k.length)), {
      timeout: 15_000,
    })
    .toBeGreaterThanOrEqual(5);

  await context.setOffline(true);
  await page.getByRole('link', { name: 'Stats' }).first().click();
  await expect(page.getByRole('heading', { name: 'Stats', level: 1 })).toBeVisible();
  await page.getByRole('link', { name: 'Recipes' }).first().click();
  await expect(page.getByRole('heading', { name: 'Recipes', level: 1 })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Recipes', level: 1 })).toBeVisible();
  await page.goto('/');
  await expect(page.getByText(`Mere ${run()}`)).toBeVisible();
  await context.setOffline(false);
});

test('offline: food added without internet is synced later', async ({ page, context }) => {
  // Visit the fridge online first so its saved copy exists (as on a real phone).
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.goto('/add');
  await context.setOffline(true);
  await page.getByLabel('Name').fill(`Oua ${run()}`);
  await page.getByRole('button', { name: 'Add to fridge' }).click();
  await page.waitForURL((url) => url.pathname === '/');
  const waiting = page.locator('section', { has: page.getByRole('heading', { name: /Added offline/ }) });
  await expect(waiting.getByText(`Oua ${run()}`)).toBeVisible();

  await context.setOffline(false);
  await expect
    .poll(
      async () =>
        (await admin().from('fridge_items').select('id').eq('user_id', userId()).eq('name', `Oua ${run()}`)).data?.length,
      { timeout: 15_000 },
    )
    .toBe(1);
});

test('a receipt photo becomes fridge items, and a correction is remembered next time', async ({ page }) => {
  test.slow(); // reading a photo takes a few seconds (and downloads the reading models the first time)
  // Both browser engines share the test account: start without remembered corrections.
  await admin().from('receipt_corrections').delete().eq('user_id', userId());
  // English UI; the sample receipt is the tilted phone photo (6 foods + a shopping bag).
  await page.goto('/add/receipt');
  await page.getByRole('button', { name: /Tilted photo/ }).click();
  await expect(page.getByRole('heading', { name: 'Found 6 food items' })).toBeVisible({ timeout: 90_000 });
  await expect(page.getByText('not food')).toBeVisible(); // the bag is suggested but unticked

  // Fix one name — Frigo should remember it for this receipt line.
  const chicken = page.getByRole('textbox', { name: 'Name' }).nth(4);
  await expect(chicken).toHaveValue('Pui');
  await chicken.fill(`Piept de pui ${run()}`);
  await page.getByRole('button', { name: 'Add 6 to fridge' }).click();
  await page.waitForURL((url) => url.pathname === '/');
  await expect(card(page, `Piept de pui ${run()}`)).toBeVisible();

  const { data } = await admin().from('fridge_items').select('source, price_lei').eq('user_id', userId()).eq('name', `Piept de pui ${run()}`).single();
  expect(data).toMatchObject({ source: 'receipt', price_lei: 59.98 });

  // Same receipt again: the corrected name comes back, marked as remembered.
  await page.goto('/add/receipt');
  await page.getByRole('button', { name: /Tilted photo/ }).click();
  await expect(page.getByRole('textbox', { name: 'Name' }).nth(4)).toHaveValue(`Piept de pui ${run()}`, { timeout: 90_000 });
  await expect(page.getByText('remembered')).toBeVisible();
});

test('Settings shows which pages are saved for offline use', async ({ page }) => {
  await page.goto('/settings');
  await expect(page.getByText(/[5-9] pages saved for offline/)).toBeVisible({ timeout: 20_000 });
});

test('the language can be switched to Russian and back', async ({ page }) => {
  await page.goto('/settings');
  await page.getByRole('radio', { name: 'Русский' }).click();
  await expect(page.getByRole('heading', { name: 'Настройки', level: 1 })).toBeVisible();
  await page.getByRole('radio', { name: 'English' }).click();
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
});
