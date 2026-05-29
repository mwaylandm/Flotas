import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TrucksClient } from "./_components/trucks-client";

export const dynamic = "force-dynamic";

export default async function TrucksPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return <TrucksClient />;
}
