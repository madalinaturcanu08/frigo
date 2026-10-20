import fs from 'node:fs';
import crypto from 'node:crypto';
import { chromium, type FullConfig } from '@playwright/test';
import { admin, AUTH_DIR, USER_FILE } from './admin';

/** Creates a throwaway, already-confirmed account and logs it in once; the tests reuse that session. */
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL!;
  const email = `e2e-${Date.now()}@example.com`;
  const password = crypto.randomBytes(18).toString('base64url');

  const { data, error } = await admin().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: 'E2E', language: 'en' },
  });
  if (error || !data.user) throw new Error(`could not create the test account: ${error?.message}`);
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  fs.writeFileSync(USER_FILE, JSON.stringify({ id: data.user.id, email }));

  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL });
  await context.addCookies([{ name: 'frigo_locale', value: 'en', url: baseURL }]);
  const page = await context.newPage();
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.waitForURL((url) => url.pathname === '/');
  await context.storageState({ path: `${AUTH_DIR}/state.json` });
  await browser.close();
}
