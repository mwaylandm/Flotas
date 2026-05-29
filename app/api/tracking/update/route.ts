import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";

// No es necesario revalidar aquí ya que es un POST endpoint

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    
    // Validar autenticación básica
    // En un entorno real, deberíamos validar que el usuario es un conductor asignado
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { lat, lng, heading, speed, batteryLevel } = body;

    // Buscar el usuario y su camión asignado
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, currentTruckId: true }
    });

    if (!user || !user.currentTruckId) {
       return NextResponse.json(
        { error: "Usuario no asignado a ningún camión" },
        { status: 400 }
      );
    }

    const truckId = user.currentTruckId;

    if (lat === undefined || lng === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: lat, lng" },
        { status: 400 }
      );
    }

    // 1. Actualizar la última ubicación conocida del camión
    const updatedTruck = await prisma.truck.update({
      where: { id: truckId },
      data: {
        currentLat: lat,
        currentLng: lng,
        currentHeading: heading || 0,
        currentSpeed: speed || 0,
        lastLocationUpdate: new Date(),
      },
    });

    // 2. Guardar en el historial (Log)
    await prisma.truckLocationLog.create({
      data: {
        truckId,
        userId: user.id,
        lat,
        lng,
        heading: heading || 0,
        speed: speed || 0,
        batteryLevel: batteryLevel,
      },
    });

    return NextResponse.json({ success: true, truck: updatedTruck });
  } catch (error) {
    console.error("Error updating location:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
