import { NextResponse, type NextRequest } from "next/server";
import { serviceClient } from "@/lib/newsletter";

// One-click unsubscribe from email apps (List-Unsubscribe-Post). A plain visit
// goes to the preferences page instead, so link scanners can't unsubscribe anyone.
export async function POST(request: NextRequest) {
  const t = request.nextUrl.searchParams.get("t") ?? "";
  const db = serviceClient();
  if (db && /^[0-9a-f-]{36}$/i.test(t)) {
    const now = new Date().toISOString();
    await db.from("newsletter_subscribers").update({ status: "unsubscribed", unsubscribed_at: now, updated_at: now }).eq("token", t);
  }
  return new NextResponse(null, { status: 200 });
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/newsletter/manage";
  url.search = "";
  url.searchParams.set("t", request.nextUrl.searchParams.get("t") ?? "");
  url.searchParams.set("unsubscribe", "1");
  return NextResponse.redirect(url);
}
