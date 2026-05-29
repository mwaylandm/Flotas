import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { readFileSync } from "fs";
import { resolve } from "path";
import { execSync } from "child_process";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || ((session.user as any)?.role !== "ADMIN" && (session.user as any)?.role !== "ADMINISTRATIVO")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    let appVersion = "0.0.0";
    try {
      const pkgPath = resolve(process.cwd(), "package.json");
      const pkgJson = JSON.parse(readFileSync(pkgPath, "utf8"));
      appVersion = pkgJson?.version ?? "0.0.0";
    } catch {}

    let commit = "unknown";
    try {
      commit = execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] })
        .toString()
        .trim();
    } catch {}

    let dbInfo: any = null;
    try {
      const dbUrl = process.env.DATABASE_URL ?? "";
      const fileMatch = dbUrl.match(/file:(.+)$/)?.[1]?.replace(/^\.\/|^\//, "");
      if (fileMatch) {
        const dbPath = resolve(process.cwd(), fileMatch);
        const { size, mtimeMs } = await import("fs").then((m) => m.statSync(dbPath));
        dbInfo = { path: dbPath, size, modifiedAt: new Date(mtimeMs).toISOString() };
      }
    } catch {}

    const data = {
      appVersion,
      commit,
      node: process.version,
      next: process.env.npm_package_dependencies_next ?? "unknown",
      env: {
        url: process.env.NEXTAUTH_URL ?? null,
        db: process.env.DATABASE_URL ?? null,
      },
      dbInfo,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener versión" }, { status: 500 });
  }
}
