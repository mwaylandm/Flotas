import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const trucks = await prisma.truck.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(trucks ?? []);
  } catch (error) {
    console.error("Error fetching trucks:", error);
    return NextResponse.json({ error: "Error al obtener camiones" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { placa, capacidad, cargaActual, estado } = body ?? {};

    if (!placa || !capacidad) {
      return NextResponse.json({ error: "Placa y capacidad son requeridos" }, { status: 400 });
    }

    const existing = await prisma.truck.findUnique({ where: { placa } });
    if (existing) {
      return NextResponse.json({ error: "Ya existe un camión con esa placa" }, { status: 400 });
    }

    const truck = await prisma.truck.create({
      data: {
        placa,
        capacidad: Number(capacidad),
        cargaActual: Number(cargaActual ?? 0),
        estado: estado ?? "DISPONIBLE",
      },
    });

    return NextResponse.json(truck, { status: 201 });
  } catch (error) {
    console.error("Error creating truck:", error);
    return NextResponse.json({ error: "Error al crear camión" }, { status: 500 });
  }
}
