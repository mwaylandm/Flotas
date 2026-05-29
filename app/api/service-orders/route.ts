import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const isOperator = (session.user as any).role === "OPERADOR";
    const whereClause: any = {};

    if (isOperator) {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      whereClause.fechaProgramada = {
        gte: todayStart
      };
    }

    const orders = await prisma.serviceOrder.findMany({
      where: whereClause,
      select: {
        id: true,
        truckId: true,
        clientId: true,
        volumen: true,
        precio: true,
        comision: true,
        comisionPagada: true,
        progreso: true,
        formaPago: true,
        pagado: true,
        referencia: true,
        fechaProgramada: true,
        fechaCompletada: true,
        observaciones: true,
        telefono: true,
        direccion: true,
        latitud: true,
        longitud: true,
        tipoFosa: true,
        facturaNombre: true,
        facturaSubidaAt: true,
        createdAt: true,
        updatedAt: true,
        truck: true,
        client: true,
        logs: {
          include: {
            user: {
              select: { name: true, email: true },
            },
          },
          orderBy: { timestamp: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json({ error: "Error al obtener Ã³rdenes" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const {
      truckId,
      clientId,
      volumen,
      precio,
      progreso,
      fechaProgramada,
      telefono,
      direccion,
      latitud,
      longitud,
      tipoFosa,
      observaciones,
      updateClientData,
      comisionPagada,
    } = body ?? {};

    // Validate required fields
    if (!truckId || !clientId || !volumen || !precio || !fechaProgramada) {
       return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    // Update client data if requested
    if (updateClientData) {
      await prisma.client.update({
        where: { id: clientId },
        data: {
          volumen: Number(volumen),
          precio: Number(precio),
          telefono: telefono || null,
          direccion: direccion || null,
          latitud: latitud ? Number(latitud) : null,
          longitud: longitud ? Number(longitud) : null,
          tipoFosa: tipoFosa || null,
        },
      });
    }

    const numericPrecio = Number(precio);

    const order = await prisma.serviceOrder.create({
      data: {
        truckId,
        clientId,
        volumen: Number(volumen),
        precio: numericPrecio,
        comision: numericPrecio * 0.01,
        comisionPagada: comisionPagada ?? false,
        progreso: progreso || "PENDIENTE",
        fechaProgramada: new Date(new Date(fechaProgramada).getTime() + 12 * 60 * 60 * 1000),
        observaciones: observaciones || null,
        telefono: telefono || null,
        direccion: direccion || null,
        latitud: latitud ? Number(latitud) : null,
        longitud: longitud ? Number(longitud) : null,
        tipoFosa: tipoFosa || null,
      },
      include: { truck: true, client: true },
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json({ error: "Error al crear orden" }, { status: 500 });
  }
}
