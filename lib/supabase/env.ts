/** Explicit environment configuration. The public anon key never substitutes for service-role access. */
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL!;

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
if(!SUPABASE_URL||!SUPABASE_ANON_KEY)throw new Error("Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY for this environment.");
