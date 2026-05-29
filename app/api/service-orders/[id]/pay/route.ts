import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { formaPago, referencia } = body ?? {};

    if (!formaPago) {
      return NextResponse.json(
        { error: "Forma de pago es requerida" },
        { status: 400 }
      );
    }

    // Validate reference for TRANSFERENCIA or PAGO_ELECTRONICO
    if ((formaPago === "TRANSFERENCIA" || formaPago === "PAGO_ELECTRONICO") && !referencia?.trim()) {
      return NextResponse.json(
        { error: "Número de referencia es requerido para este tipo de pago" },
        { status: 400 }
      );
    }

    // Get the current order to check its status
    const existingOrder = await prisma.serviceOrder.findUnique({
      where: { id: params?.id },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }

    // Permitir actualizar forma de pago incluso si ya está pagado
    // Update the order with payment info
    const order = await prisma.serviceOrder.update({
      where: { id: params?.id },
      data: {
        pagado: true,
        formaPago,
        referencia: referencia?.trim() || null,
      },
      include: { truck: true, client: true },
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error("Error processing payment:", error);
    return NextResponse.json({ error: "Error al procesar pago" }, { status: 500 });
  }
}
