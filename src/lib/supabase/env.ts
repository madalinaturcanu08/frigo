// Supabase connection settings. The second names are the ones Vercel's Supabase integration creates
// (older "anon" / "service_role" naming); either set works. Each NEXT_PUBLIC_ name must be written out
// in full so Next.js can inline it into browser code.

export const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '') as string;

export const SUPABASE_PUBLIC_KEY = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  '') as string;
