import { NextResponse } from "next/server";
import { listActiveReps } from "@/lib/reps";

export async function GET() {
  return NextResponse.json({ reps: listActiveReps() });
}
