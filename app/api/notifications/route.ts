import { NextResponse } from "next/server";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { listNotificationsForRep, markNotificationRead } from "@/lib/notifications";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !hasRole(user, "rep")) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  return NextResponse.json({ notifications: listNotificationsForRep(user.id) });
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user || !hasRole(user, "rep")) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Notification id required." }, { status: 400 });

  markNotificationRead(Number(id), user.id);
  return NextResponse.json({ ok: true });
}
