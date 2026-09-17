/** Browser-safe defaults. Anon key is public; service role stays in env only. */
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://skwwgjjgeativyevkkpl.supabase.co";

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNrd3dnampnZWF0aXZ5ZXZra3BsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1ODE0ODIsImV4cCI6MjEwNTE1NzQ4Mn0.jhdCDSAQDFmkInOzurz3gz5vwpq37Sx98Ul8fhGO1wc";
