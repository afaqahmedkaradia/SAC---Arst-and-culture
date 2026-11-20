import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { subscribeFromSignup } from "@/lib/newsletter-signup";

// Where links in Supabase emails land (sign-up confirmation, password reset).
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const rawNext = params.get("next") ?? "/dashboard";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";
  const supabase = await createClient();

  let ok = false;
  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;

  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error;
  }

  // A new account that asked for newsletters is subscribed once its email is confirmed.
  if (ok && type === "signup") {
    const { data } = await supabase.auth.getUser();
    await subscribeFromSignup(data.user);
  }
  if (ok && code) {
    const { data } = await supabase.auth.getUser();
    if (data.user && data.user.created_at && Date.now() - Date.parse(data.user.created_at) < 3 * 24 * 3600 * 1000) await subscribeFromSignup(data.user);
  }

  // nextUrl keeps the Webflow Cloud mount path when redirecting.
  const url = request.nextUrl.clone();
  url.search = "";
  if (ok) {
    url.pathname = next;
  } else {
    url.pathname = "/login";
    url.searchParams.set("error", "link");
  }
  return NextResponse.redirect(url);
}
