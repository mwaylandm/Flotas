import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { normalizeClientName } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const clients = await prisma.client.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(clients ?? []);
  } catch (error) {
    console.error("Error fetching clients:", error);
    return NextResponse.json({ error: "Error al obtener clientes" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { nombre, telefono, email, direccion, tipoFosa, tipoCliente, rut, latitud, longitud, observaciones, volumen, precio } = body ?? {};

    if (!nombre || !telefono || !direccion) {
      return NextResponse.json(
        { error: "Nombre, telÃ©fono y direcciÃ³n son requeridos" },
        { status: 400 }
      );
    }

    const client = await prisma.client.create({
      data: {
        nombre: normalizeClientName(nombre),
        telefono,
        email: email || null,
        direccion,
        tipoFosa: tipoFosa ?? "SEPTICA",
        tipoCliente: tipoCliente ?? "PERSONA_NATURAL",
        rut: tipoCliente === "EMPRESA" ? (rut || null) : null,
        latitud: latitud ? Number(latitud) : 0,
        longitud: longitud ? Number(longitud) : 0,
        observaciones: observaciones || null,
        volumen: volumen ? Number(volumen) : 0,
        precio: precio ? Number(precio) : 0,
      },
    });

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    console.error("Error creating client:", error);
    return NextResponse.json({ error: "Error al crear cliente" }, { status: 500 });
  }
}
