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

    const order = await prisma.serviceOrder.findUnique({
      where: { id: params?.id },
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
    });

    if (!order) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json({ error: "Error al obtener orden" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { truckId, clientId, volumen, precio, progreso, fechaProgramada, telefono, direccion, latitud, longitud, tipoFosa, observaciones, updateClientData, comisionPagada } = body ?? {};

    // Get current order to check payment status
    const existingOrder = await prisma.serviceOrder.findUnique({
      where: { id: params?.id },
      include: { client: true },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }

    // Validate: Cannot change to COMPLETADO without payment, unless client is EMPRESA
    const isEmpresa = existingOrder.client?.tipoCliente === "EMPRESA";
    if (progreso === "COMPLETADO" && !existingOrder.pagado && !isEmpresa) {
      return NextResponse.json(
        { error: "No se puede completar la orden sin registrar el pago primero" },
        { status: 400 }
      );
    }

    // Determine final progreso value
    let finalProgreso = progreso;
    
    // If setting to COMPLETADO:
    // 1. If payment method is FACTURACION, change to FACTURACION_PENDIENTE
    // 2. If client is EMPRESA, automatically set as FACTURACION and change to FACTURACION_PENDIENTE
    let shouldUpdatePayment = false;
    
    if (progreso === "COMPLETADO") {
      if (existingOrder.formaPago === "FACTURACION") {
        finalProgreso = "FACTURACION_PENDIENTE";
      } else if (isEmpresa) {
        finalProgreso = "FACTURACION_PENDIENTE";
        shouldUpdatePayment = true;
      }
    }

    const order = await prisma.$transaction(async (tx) => {
      // Update client's volumen and precio if updateClientData is true
      if (updateClientData && clientId) {
        await tx.client.update({
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

      const numericPrecio = precio !== undefined ? Number(precio) : existingOrder.precio;

      const updatedOrder = await tx.serviceOrder.update({
        where: { id: params?.id },
        data: {
          ...(truckId && { truckId }),
          ...(clientId && { clientId }),
          ...(volumen !== undefined && { volumen: Number(volumen) }),
          ...(precio !== undefined && { precio: numericPrecio }),
          ...(precio !== undefined && { comision: numericPrecio * 0.01 }),
          ...(comisionPagada !== undefined && { comisionPagada }),
          ...(telefono !== undefined && { telefono: telefono || null }),
          ...(direccion !== undefined && { direccion: direccion || null }),
          ...(latitud !== undefined && { latitud: latitud ? Number(latitud) : null }),
          ...(longitud !== undefined && { longitud: longitud ? Number(longitud) : null }),
          ...(tipoFosa !== undefined && { tipoFosa: tipoFosa || null }),
          ...(observaciones !== undefined && { observaciones: observaciones || null }),
          ...(finalProgreso && { progreso: finalProgreso }),
          ...(fechaProgramada && { fechaProgramada: new Date(fechaProgramada) }),
          ...(shouldUpdatePayment && { 
            formaPago: "FACTURACION",
            pagado: true 
          }),
        },
        include: { truck: true, client: true },
      });

      // Log status change
      if (finalProgreso && finalProgreso !== existingOrder.progreso) {
        await tx.serviceOrderLog.create({
          data: {
            serviceOrderId: params.id,
            previousStatus: existingOrder.progreso,
            newStatus: finalProgreso as any,
            userId: (session.user as any).id,
          },
        });
      }

      return updatedOrder;
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error("Error updating order:", error);
    return NextResponse.json({ error: "Error al actualizar orden" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    await prisma.serviceOrder.delete({
      where: { id: params?.id },
    });

    return NextResponse.json({ message: "Orden eliminada" });
  } catch (error) {
    console.error("Error deleting order:", error);
    return NextResponse.json({ error: "Error al eliminar orden" }, { status: 500 });
  }
}
