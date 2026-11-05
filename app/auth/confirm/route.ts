import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeWorkspaceRedirect } from "@/lib/auth/redirect";

/** Supports SSR email templates using TokenHash; default PKCE links still use /auth/callback. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash"), type = searchParams.get("type");
  const recovery = type === "recovery";
  if (token_hash && (type === "email" || type === "recovery" || type === "signup")) {
    const { error } = await (await createClient()).auth.verifyOtp({ token_hash, type });
    if (!error) return NextResponse.redirect(safeWorkspaceRedirect(recovery ? "/reset-password" : searchParams.get("next") ?? "/onboarding", origin));
  }
  return NextResponse.redirect(new URL(recovery ? "/forgot-password?error=expired" : "/sign-in?error=callback", origin));
}
