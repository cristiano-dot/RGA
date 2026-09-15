import { redirect } from "next/navigation";
import { getCurrentRep } from "@/lib/auth";
import RepDashboard from "./RepDashboard";

export default async function RepPage() {
  const rep = await getCurrentRep();
  if (!rep) redirect("/login");

  return <RepDashboard rep={rep} />;
}
