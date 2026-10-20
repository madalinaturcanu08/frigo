import fs from 'node:fs';
import { admin, USER_FILE } from './admin';

/** Deletes the throwaway account; its fridge items go with it (on delete cascade). */
export default async function globalTeardown() {
  if (!fs.existsSync(USER_FILE)) return;
  const { id } = JSON.parse(fs.readFileSync(USER_FILE, 'utf8'));
  const { error } = await admin().auth.admin.deleteUser(id);
  if (error) console.warn(`could not delete the test account ${id}: ${error.message}`);
  fs.rmSync(USER_FILE);
}
