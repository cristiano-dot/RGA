import { NextResponse } from "next/server";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { createUser, listUsers, UserValidationError } from "@/lib/users";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !hasRole(user, "admin")) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  return NextResponse.json({ users: listUsers() });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || !hasRole(user, "admin")) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { name, email, password, rep_number, roles } = body ?? {};

  try {
    const created = createUser({
      name: String(name ?? ""),
      email: String(email ?? ""),
      password: String(password ?? ""),
      repNumber: String(rep_number ?? ""),
      roles: Array.isArray(roles) ? roles : [],
    });
    return NextResponse.json({ ok: true, user: created });
  } catch (err) {
    if (err instanceof UserValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
