import { redirect } from "next/navigation";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { getRgaForRep } from "@/lib/rga";
import { listActivity } from "@/lib/activity";
import RepRgaDetail from "./RepRgaDetail";

export default async function RepRgaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasRole(user, "rep")) redirect("/admin");

  const { id } = await params;
  const rgaId = Number(id);
  const result = getRgaForRep(rgaId, user.id);
  if (!result) {
    return (
      <div className="mx-auto max-w-3xl flex-1 px-6 py-12 text-center text-slate-500">
        RGA request not found.
      </div>
    );
  }

  const activity = listActivity(rgaId);

  return <RepRgaDetail rga={result.rga} items={result.items} activity={activity} />;
}
