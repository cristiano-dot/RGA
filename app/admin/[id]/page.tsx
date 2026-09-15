import { redirect } from "next/navigation";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { getRgaWithItems } from "@/lib/rga";
import { listActivity, markSeenByAdmin } from "@/lib/activity";
import RgaDetail from "./RgaDetail";

export default async function AdminRgaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasRole(user, "admin")) redirect("/rep");

  const { id } = await params;
  const rgaId = Number(id);
  const result = getRgaWithItems(rgaId);
  if (!result) {
    return (
      <div className="mx-auto max-w-3xl flex-1 px-6 py-12 text-center text-slate-500">
        RGA request not found.
      </div>
    );
  }

  markSeenByAdmin(rgaId);
  const activity = listActivity(rgaId);

  return <RgaDetail rga={result.rga} items={result.items} activity={activity} />;
}
