import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UsersClient } from "./_components/users-client";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect("/login");
  }
  
  if ((session.user as any)?.role !== "ADMIN" && (session.user as any)?.role !== "ADMINISTRATIVO") {
    redirect("/dashboard");
  }

  return <UsersClient />;
}
