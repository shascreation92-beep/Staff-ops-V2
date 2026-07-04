import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function TeamLiveRosterRedirectPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/auth/signin");
  }

  const role = session.user.role;
  if (role === "SUPER_ADMIN" || role === "COMPANY_OWNER" || role === "IT_DEPARTMENT") {
    redirect("/master-accounts-pool");
  } else {
    redirect("/accounts");
  }
}
