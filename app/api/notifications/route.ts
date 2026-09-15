import { NextResponse } from "next/server";
import { getCurrentRep } from "@/lib/auth";
import { listNotificationsForRep, markNotificationRead } from "@/lib/notifications";

export async function GET() {
  const rep = await getCurrentRep();
  if (!rep) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  return NextResponse.json({ notifications: listNotificationsForRep(rep.id) });
}

export async function PATCH(req: Request) {
  const rep = await getCurrentRep();
  if (!rep) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Notification id required." }, { status: 400 });

  markNotificationRead(Number(id), rep.id);
  return NextResponse.json({ ok: true });
}
