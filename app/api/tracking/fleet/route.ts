import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";

// Revalidar cada 30 segundos
export const revalidate = 30;

export async function GET() {

  try {
    const session = await getServerSession();

    // Solo admins o administrativo pueden ver toda la flota
    // (Por simplicidad lo dejo abierto a usuarios autenticados por ahora)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Obtener todos los camiones activos
    const trucks = await prisma.truck.findMany({
      select: {
        id: true,
        placa: true,
        estado: true,
        currentLat: true,
        currentLng: true,
        currentHeading: true,
        currentSpeed: true,
        lastLocationUpdate: true,
        cargaActual: true,
        capacidad: true,
        serviceOrders: {
          where: {
            progreso: { in: ["EN_CAMINO", "OPERANDO"] }
          },
          take: 1,
          select: {
            id: true,
            progreso: true,
            latitud: true,
            longitud: true,
            client: {
              select: {
                nombre: true,
                latitud: true,
                longitud: true
              }
            }
          }
        }
      },
    });

    return NextResponse.json({ trucks });
  } catch (error) {
    console.error("Error fetching fleet location:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
