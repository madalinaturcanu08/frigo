import fs from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { admin, USER_FILE } from './admin';

// Main user flows, end to end: a real browser (phone-sized) against a production build and the real database,
// logged in as a throwaway account that global-teardown deletes afterwards.

const userId = () => JSON.parse(fs.readFileSync(USER_FILE, 'utf8')).id as string;
// Same suffix for every test in a run, even if Playwright restarts the file after a failure.
const run = userId().slice(0, 8);

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
  await addItem(page, `Lapte ${run}`, '2 days');
  const soon = page.locator('section', { has: page.getByRole('heading', { name: /Use soon/ }) });
  await expect(soon.getByText(`Lapte ${run}`)).toBeVisible();

  await addItem(page, `Mere ${run}`, '1 week');
  const fresh = page.locator('section', { has: page.getByRole('heading', { name: /Fresh/ }) });
  await expect(fresh.getByText(`Mere ${run}`)).toBeVisible();
});

test('a guessed date comes from the shelf-life table and is marked as estimated', async ({ page }) => {
  await page.goto('/add');
  await page.getByLabel('Name').fill(`Iaurt ${run}`);
  // Dairy in the fridge = 7 days in supabase/seed.sql
  await expect(page.getByRole('button', { name: 'Guess for me (~7 d)' })).toBeVisible();
  await expect(page.getByText('estimated', { exact: false }).first()).toBeVisible();
});

test('"Used it" removes the item and counts it in the stats', async ({ page }) => {
  await page.goto('/');
  const saved = page.waitForResponse((r) => r.request().method() === 'POST' && r.ok());
  await card(page, `Lapte ${run}`).getByRole('button', { name: 'Used it' }).click();
  await saved; // the change reached the server before we leave the page
  await expect(page.getByRole('status').filter({ hasText: 'saved from the bin' })).toBeVisible();
  await expect(card(page, `Lapte ${run}`)).toHaveCount(0);

  await page.goto('/stats');
  const foodSaved = page.locator('.card', { hasText: 'Food saved' });
  await expect(foodSaved.locator('.font-pixel')).toHaveText('1');
});

test('offline: tossing food is kept on the phone and synced when the internet is back', async ({ page, context }) => {
  await addItem(page, `Paine ${run}`, '2 days');
  // Let the service worker take control and keep a copy of the fridge page.
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  await context.setOffline(true);
  await card(page, `Paine ${run}`).getByRole('button', { name: 'Tossed' }).click();
  await expect(card(page, `Paine ${run}`)).toHaveCount(0);
  await expect(page.getByRole('status').filter({ hasText: "You're offline" })).toContainText('1 change');

  await context.setOffline(false);
  await expect(page.getByRole('status').filter({ hasText: /offline|sync/ })).toHaveCount(0, { timeout: 15_000 });

  const { data } = await admin()
    .from('fridge_items')
    .select('status, closed_at')
    .eq('user_id', userId())
    .eq('name', `Paine ${run}`)
    .single();
  expect(data?.status).toBe('wasted');
  expect(data?.closed_at).not.toBeNull();
});

test('offline: the fridge still opens from the saved copy', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'My fridge' })).toBeVisible();
  await expect(page.getByText(`Mere ${run}`)).toBeVisible();
  await context.setOffline(false);
});

test('offline: food added without internet is synced later', async ({ page, context }) => {
  // Visit the fridge online first so its saved copy exists (as on a real phone).
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.goto('/add');
  await context.setOffline(true);
  await page.getByLabel('Name').fill(`Oua ${run}`);
  await page.getByRole('button', { name: 'Add to fridge' }).click();
  await page.waitForURL((url) => url.pathname === '/');
  const waiting = page.locator('section', { has: page.getByRole('heading', { name: /Added offline/ }) });
  await expect(waiting.getByText(`Oua ${run}`)).toBeVisible();

  await context.setOffline(false);
  await expect
    .poll(
      async () =>
        (await admin().from('fridge_items').select('id').eq('user_id', userId()).eq('name', `Oua ${run}`)).data?.length,
      { timeout: 15_000 },
    )
    .toBe(1);
});

test('the language can be switched to Russian and back', async ({ page }) => {
  await page.goto('/settings');
  await page.getByRole('radio', { name: 'Русский' }).click();
  await expect(page.getByRole('heading', { name: 'Настройки', level: 1 })).toBeVisible();
  await page.getByRole('radio', { name: 'English' }).click();
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
});
