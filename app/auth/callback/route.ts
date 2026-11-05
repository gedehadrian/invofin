import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeWorkspaceRedirect } from "@/lib/auth/redirect";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/app";
  const failure = next === "/reset-password" ? "/forgot-password?error=expired" : "/sign-in?error=callback";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(new URL(failure, origin));
  }
  if (!code || searchParams.has("error")) return NextResponse.redirect(new URL(failure, origin));

  return NextResponse.redirect(safeWorkspaceRedirect(next, origin));
}
