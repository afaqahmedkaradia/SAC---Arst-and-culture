"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { BASE_PATH, SITE_URL } from "@/lib/env";
import { DISCIPLINES } from "@/lib/constants";

export type FormState = { error?: string; sent?: boolean; email?: string } | undefined;

// The public address of the app, used in emails Supabase sends.
async function appUrl() {
  if (SITE_URL) return SITE_URL;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}${BASE_PATH}`;
}

function safeNext(raw: FormDataEntryValue | null, fallback = "/dashboard") {
  const s = typeof raw === "string" ? raw : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : fallback;
}

export async function signUp(_prev: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const displayName = String(form.get("display_name") ?? "").trim();
  const role = form.get("role") === "artist" ? "artist" : "member";
  const disciplines = form
    .getAll("disciplines")
    .map(String)
    .filter((d) => (DISCIPLINES as readonly string[]).includes(d));
  const workLink = String(form.get("work_link") ?? "").trim();

  if (!displayName) return { error: "Please add your name." };
  if (!email) return { error: "Please add your email address." };
  if (password.length < 10) return { error: "Your password needs at least 10 characters." };
  if (form.get("agree") !== "on") return { error: "Please agree to the community guidelines." };
  if (role === "artist" && disciplines.length === 0) return { error: "Pick at least one discipline." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${await appUrl()}/auth/confirm?next=/dashboard`,
      data: { display_name: displayName, role, disciplines, work_link: workLink },
    },
  });
  if (error) return { error: error.message };

  // If email confirmation is turned off in Supabase, the person is signed in already.
  if (data.session) redirect("/dashboard?welcome=1");
  return { sent: true, email };
}

export async function signIn(_prev: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return {
      error:
        error.message === "Email not confirmed"
          ? "Please confirm your email first. Check your inbox for the link we sent."
          : "That email and password don't match. Try again or reset your password.",
    };
  }
  redirect(safeNext(form.get("next")));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function sendPasswordReset(_prev: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim();
  if (!email) return { error: "Please add your email address." };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await appUrl()}/auth/confirm?next=/account/password`,
  });
  // Same message whether or not the account exists, so emails can't be probed.
  return { sent: true, email };
}

export async function updatePassword(_prev: FormState, form: FormData): Promise<FormState> {
  const password = String(form.get("password") ?? "");
  if (password.length < 10) return { error: "Your password needs at least 10 characters." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  redirect("/dashboard?password=1");
}
