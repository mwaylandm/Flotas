import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_PDF_BYTES = 10 * 1024 * 1024;

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const order = await prisma.serviceOrder.findUnique({
      where: { id: params?.id },
      select: { facturaPdf: true, facturaNombre: true, facturaSubidaAt: true },
    });

    if (!order || !order.facturaPdf) {
      return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 });
    }

    const filename = (order.facturaNombre || `factura-${params.id}.pdf`).replace(/[\\r\\n"]/g, "");
    const headers = new Headers();
    headers.set("Content-Type", "application/pdf");
    headers.set("Content-Disposition", `inline; filename="${filename}"`);
    headers.set("Cache-Control", "no-store");

    return new NextResponse(order.facturaPdf, { status: 200, headers });
  } catch (error) {
    console.error("Error fetching invoice:", error);
    return NextResponse.json({ error: "Error al obtener factura" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    if (role !== "ADMIN" && role !== "ADMINISTRATIVO") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const existing = await prisma.serviceOrder.findUnique({
      where: { id: params?.id },
      include: { client: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }

    if (existing.client?.tipoCliente !== "EMPRESA") {
      return NextResponse.json({ error: "Solo disponible para Persona Jurídica" }, { status: 400 });
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
    }

    if ((file as File).type !== "application/pdf") {
      return NextResponse.json({ error: "Solo se permite PDF" }, { status: 400 });
    }

    if ((file as File).size > MAX_PDF_BYTES) {
      return NextResponse.json({ error: "Archivo demasiado grande" }, { status: 413 });
    }

    const buffer = Buffer.from(await (file as File).arrayBuffer());

    const updated = await prisma.serviceOrder.update({
      where: { id: params?.id },
      data: {
        facturaPdf: buffer,
        facturaNombre: (file as File).name || null,
        facturaSubidaAt: new Date(),
      },
      select: { id: true, facturaNombre: true, facturaSubidaAt: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error uploading invoice:", error);
    return NextResponse.json({ error: "Error al subir factura" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    if (role !== "ADMIN" && role !== "ADMINISTRATIVO") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const updated = await prisma.serviceOrder.update({
      where: { id: params?.id },
      data: { facturaPdf: null, facturaNombre: null, facturaSubidaAt: null },
      select: { id: true, facturaNombre: true, facturaSubidaAt: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error deleting invoice:", error);
    return NextResponse.json({ error: "Error al eliminar factura" }, { status: 500 });
  }
}

