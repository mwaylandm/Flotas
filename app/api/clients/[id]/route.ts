import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { normalizeClientName } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const client = await prisma.client.findUnique({
      where: { id: params?.id },
    });

    if (!client) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }

    return NextResponse.json(client);
  } catch (error) {
    console.error("Error fetching client:", error);
    return NextResponse.json({ error: "Error al obtener cliente" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { nombre, telefono, email, direccion, tipoFosa, tipoCliente, rut, latitud, longitud, observaciones, volumen, precio } = body ?? {};

    const client = await prisma.client.update({
      where: { id: params?.id },
      data: {
        ...(nombre && { nombre: normalizeClientName(nombre) }),
        ...(telefono && { telefono }),
        ...(email !== undefined && { email: email || null }),
        ...(direccion && { direccion }),
        ...(tipoFosa && { tipoFosa }),
        ...(tipoCliente && { tipoCliente }),
        rut: tipoCliente === "EMPRESA" ? (rut || null) : null,
        ...(latitud !== undefined && { latitud: Number(latitud) }),
        ...(longitud !== undefined && { longitud: Number(longitud) }),
        observaciones: observaciones || null,
        ...(volumen !== undefined && { volumen: Number(volumen) }),
        ...(precio !== undefined && { precio: Number(precio) }),
      },
    });

    return NextResponse.json(client);
  } catch (error) {
    console.error("Error updating client:", error);
    return NextResponse.json({ error: "Error al actualizar cliente" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    await prisma.client.delete({
      where: { id: params?.id },
    });

    return NextResponse.json({ message: "Cliente eliminado" });
  } catch (error) {
    console.error("Error deleting client:", error);
    return NextResponse.json({ error: "Error al eliminar cliente" }, { status: 500 });
  }
}
