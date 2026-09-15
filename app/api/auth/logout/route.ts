import { NextResponse } from "next/server";
import { clearRepSession } from "@/lib/auth";

export async function POST() {
  await clearRepSession();
  return NextResponse.json({ ok: true });
}
