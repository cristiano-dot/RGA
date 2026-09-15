import { NextResponse } from "next/server";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { setUserActive, updateUser, UserValidationError } from "@/lib/users";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !hasRole(user, "admin")) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const targetId = Number(id);
  const body = await req.json().catch(() => ({}));

  try {
    if (typeof body?.is_active === "boolean") {
      if (targetId === user.id && !body.is_active) {
        return NextResponse.json(
          { error: "You can't deactivate your own account." },
          { status: 400 }
        );
      }
      setUserActive(targetId, body.is_active);
    }

    if (
      body?.name !== undefined ||
      body?.email !== undefined ||
      body?.rep_number !== undefined ||
      body?.roles !== undefined
    ) {
      const updated = updateUser(targetId, {
        name: String(body.name ?? ""),
        email: String(body.email ?? ""),
        repNumber: String(body.rep_number ?? ""),
        roles: Array.isArray(body.roles) ? body.roles : [],
      });
      return NextResponse.json({ ok: true, user: updated });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UserValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
