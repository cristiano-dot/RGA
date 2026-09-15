import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { listAllRgas } from "@/lib/rga";

export async function GET(req: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const url = new URL(req.url);
  const sort = url.searchParams.get("sort") ?? "created_at";
  const dir = (url.searchParams.get("dir") ?? "desc") as "asc" | "desc";
  const status = url.searchParams.get("status") ?? "all";
  const reason = url.searchParams.get("reason") ?? "";

  const rgas = listAllRgas({ sort, dir, status, reason });
  return NextResponse.json({ rgas });
}
