import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    const now = new Date();
    // Default to 30 days ago if not provided
    const startDate = startDateParam ? new Date(startDateParam) : new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
    // Default to end of today if not provided
    const endDate = endDateParam ? new Date(endDateParam) : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    // Ensure endDate includes the full day if it's just a date string
    if (endDateParam && endDateParam.length === 10) {
        endDate.setHours(23, 59, 59, 999);
    }

    const isoDateKey = (date: Date) => date.toISOString().slice(0, 10);
    const startYmd = startDateParam && startDateParam.length === 10 ? startDateParam : isoDateKey(startDate);
    const endYmd = endDateParam && endDateParam.length === 10 ? endDateParam : isoDateKey(endDate);
    const broadStart = new Date(`${startYmd}T00:00:00.000Z`);
    broadStart.setUTCDate(broadStart.getUTCDate() - 1);
    const broadEnd = new Date(`${endYmd}T23:59:59.999Z`);
    broadEnd.setUTCDate(broadEnd.getUTCDate() + 1);

    const orders = await prisma.serviceOrder.findMany({
      where: {
        fechaProgramada: { gte: broadStart, lte: broadEnd },
      },
      include: {
        truck: true,
        client: true,
      },
      orderBy: { fechaProgramada: "asc" },
    });

    const filteredOrders = orders.filter((o) => {
      const dateKey = isoDateKey(new Date(o.fechaProgramada || o.createdAt));
      return dateKey >= startYmd && dateKey <= endYmd;
    });

    // Use filteredOrders for calculations
    const ordersToProcess = filteredOrders;

    // 2. Process Sales Data (Ventas)
    // Group by date
    const salesByDate: Record<string, { date: string; amount: number; amountNatural: number; amountJuridica: number; count: number; volume: number }> = {};
    
    ordersToProcess.forEach(order => {
        // Use scheduled date or created date
        const dateObj = new Date(order.fechaProgramada || order.createdAt);
        const dateKey = isoDateKey(dateObj);
        
        if (!salesByDate[dateKey]) {
            salesByDate[dateKey] = { date: dateKey, amount: 0, amountNatural: 0, amountJuridica: 0, count: 0, volume: 0 };
        }

        const amount = order.precio || 0;
        const volume = order.volumen || 0;
        const isJuridica = order.client?.tipoCliente === "EMPRESA";

        salesByDate[dateKey].amount += amount;
        if (isJuridica) {
          salesByDate[dateKey].amountJuridica += amount;
        } else {
          salesByDate[dateKey].amountNatural += amount;
        }
        salesByDate[dateKey].count += 1;
        salesByDate[dateKey].volume += volume;
    });

    const salesData = Object.values(salesByDate).sort((a, b) => a.date.localeCompare(b.date));
    
    // Calculate totals from the aggregated daily data to ensure consistency
    let totalSales = 0;
    let totalSalesNatural = 0;
    let totalSalesJuridica = 0;
    let totalServices = 0;
    let totalVolume = 0;

    salesData.forEach(day => {
        totalSales += day.amount;
        totalSalesNatural += day.amountNatural;
        totalSalesJuridica += day.amountJuridica;
        totalServices += day.count;
        totalVolume += day.volume;
    });

    const averageTicket = totalServices > 0 ? totalSales / totalServices : 0;

    // 3. Process Commissions (Comisiones)
    // Group by Truck
    const commissionsByTruck: Record<string, { truckId: string; plate: string; totalGenerated: number; totalCommission: number; paidCommission: number; pendingCommission: number }> = {};

    ordersToProcess.forEach(order => {
        if (!order.truckId) return;
        
        const truckId = order.truckId;
        const plate = order.truck?.placa || "Desconocido";
        
        if (!commissionsByTruck[truckId]) {
            commissionsByTruck[truckId] = { 
                truckId, 
                plate, 
                totalGenerated: 0, 
                totalCommission: 0, 
                paidCommission: 0, 
                pendingCommission: 0 
            };
        }

        const amount = order.precio || 0;
        // Default 1% if not specified
        const commission = order.comision ?? (amount * 0.01);

        commissionsByTruck[truckId].totalGenerated += amount;
        commissionsByTruck[truckId].totalCommission += commission;

        if (order.comisionPagada) {
            commissionsByTruck[truckId].paidCommission += commission;
        } else {
            commissionsByTruck[truckId].pendingCommission += commission;
        }
    });

    const commissionData = Object.values(commissionsByTruck);

    // 4. Process Clients (Clientes)
    // Top clients by revenue
    const clientsMap: Record<string, { clientId: string; name: string; totalSpent: number; serviceCount: number; lastServiceDate: Date }> = {};

    ordersToProcess.forEach(order => {
        if (!order.clientId) return;

        const clientId = order.clientId;
        const name = order.client?.nombre || "Desconocido";
        const amount = order.precio || 0;
        const date = order.fechaProgramada || order.createdAt;

        if (!clientsMap[clientId]) {
            clientsMap[clientId] = {
                clientId,
                name,
                totalSpent: 0,
                serviceCount: 0,
                lastServiceDate: date
            };
        }

        clientsMap[clientId].totalSpent += amount;
        clientsMap[clientId].serviceCount += 1;
        if (date > clientsMap[clientId].lastServiceDate) {
            clientsMap[clientId].lastServiceDate = date;
        }
    });

    const clientData = Object.values(clientsMap).sort((a, b) => b.totalSpent - a.totalSpent);

    // 5. Process Fleet (Flota)
    // Efficiency metrics
    const fleetMap: Record<string, { truckId: string; plate: string; serviceCount: number; totalVolume: number }> = {};

    ordersToProcess.forEach(order => {
        if (!order.truckId) return;
        
        const truckId = order.truckId;
        const plate = order.truck?.placa || "Desconocido";
        const volume = order.volumen || 0;

        if (!fleetMap[truckId]) {
            fleetMap[truckId] = {
                truckId,
                plate,
                serviceCount: 0,
                totalVolume: 0
            };
        }

        fleetMap[truckId].serviceCount += 1;
        fleetMap[truckId].totalVolume += volume;
    });

    const fleetData = Object.values(fleetMap).map(f => ({
        ...f,
        averageVolume: f.serviceCount > 0 ? f.totalVolume / f.serviceCount : 0
    }));

    // 6. Process Days (Días)
    // Group by day of week (0-6, Sunday-Saturday)
    const daysMap: Record<number, { dayIndex: number; name: string; amount: number; count: number; occurrences: number }> = {};
    const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

    // Initialize all days
    for (let i = 0; i < 7; i++) {
        daysMap[i] = { dayIndex: i, name: dayNames[i], amount: 0, count: 0, occurrences: 0 };
    }

    const iterDate = new Date(`${startYmd}T00:00:00.000Z`);
    const targetDate = new Date(`${endYmd}T00:00:00.000Z`);
    let safetyCounter = 0;
    while (iterDate <= targetDate && safetyCounter < 10000) {
      const dayIdx = iterDate.getUTCDay();
      daysMap[dayIdx].occurrences += 1;
      iterDate.setUTCDate(iterDate.getUTCDate() + 1);
      safetyCounter++;
    }

    ordersToProcess.forEach(order => {
        const dateObj = new Date(order.fechaProgramada || order.createdAt);
        const dateKey = isoDateKey(dateObj);
        const [y, m, d] = dateKey.split("-").map(Number);
        const dayIndex = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
        const amount = order.precio || 0;

        daysMap[dayIndex].amount += amount;
        daysMap[dayIndex].count += 1;
    });

    const daysData = Object.values(daysMap);


    return NextResponse.json({
        sales: {
            summary: {
                totalSales,
                totalSalesNatural,
                totalSalesJuridica,
                totalServices,
                totalVolume,
                averageTicket
            },
            daily: salesData
        },
        commissions: commissionData,
        clients: clientData,
        fleet: fleetData,
        days: daysData
    });

  } catch (error) {
    console.error("Error fetching reports:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
