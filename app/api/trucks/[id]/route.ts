import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const truck = await prisma.truck.findUnique({
      where: { id: params?.id },
    });

    if (!truck) {
      return NextResponse.json({ error: "Camión no encontrado" }, { status: 404 });
    }

    return NextResponse.json(truck);
  } catch (error) {
    console.error("Error fetching truck:", error);
    return NextResponse.json({ error: "Error al obtener camión" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { placa, capacidad, cargaActual, estado } = body ?? {};

    const truck = await prisma.truck.update({
      where: { id: params?.id },
      data: {
        ...(placa && { placa }),
        ...(capacidad !== undefined && { capacidad: Number(capacidad) }),
        ...(cargaActual !== undefined && { cargaActual: Number(cargaActual) }),
        ...(estado && { estado }),
      },
    });

    return NextResponse.json(truck);
  } catch (error) {
    console.error("Error updating truck:", error);
    return NextResponse.json({ error: "Error al actualizar camión" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    await prisma.truck.delete({
      where: { id: params?.id },
    });

    return NextResponse.json({ message: "Camión eliminado" });
  } catch (error) {
    console.error("Error deleting truck:", error);
    return NextResponse.json({ error: "Error al eliminar camión" }, { status: 500 });
  }
}
