import { redirect } from "next/navigation";
import { getCurrentUser, hasRole } from "@/lib/auth";
import RepDashboard from "./RepDashboard";

export default async function RepPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasRole(user, "rep")) redirect("/admin");

  return <RepDashboard user={user} />;
}
