import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth";
import AdminReps from "./AdminReps";

export default async function AdminRepsPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");

  return <AdminReps admin={admin} />;
}
