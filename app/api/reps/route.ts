import { NextResponse } from "next/server";
import { listActiveReps } from "@/lib/users";

export async function GET() {
  return NextResponse.json({ reps: listActiveReps() });
}
