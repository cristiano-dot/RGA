import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();
  const reps = db
    .prepare("SELECT id, rep_number, name FROM sales_reps ORDER BY rep_number ASC")
    .all();
  return NextResponse.json({ reps });
}
