import { redirect } from "next/navigation";
import { getCurrentUser, hasRole } from "@/lib/auth";
import AdminUsers from "./AdminUsers";

export default async function AdminUsersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasRole(user, "admin")) redirect("/rep");

  return <AdminUsers currentUser={user} />;
}
