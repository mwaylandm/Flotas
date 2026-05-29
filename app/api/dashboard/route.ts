import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const [trucks, clients, orders] = await Promise.all([
      prisma.truck.findMany(),
      prisma.client.count(),
      prisma.serviceOrder.findMany({
        include: { truck: true, client: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const activeServices = orders?.filter(
      (o) => o?.progreso !== "COMPLETADO" && o?.progreso !== "FACTURACION_PENDIENTE"
    )?.length ?? 0;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyOrders = orders?.filter(
      (o) => new Date(o?.createdAt) >= startOfMonth
    ) ?? [];
    
    const completedStates = ["COMPLETADO", "FACTURACION_PENDIENTE", "FACTURACION_TERMINADA", "TERMINADA_CONTABILIZADA", "PAGO_REALIZADO_Y_CONTABILIZADO"];

    const completedMonthlyOrders = monthlyOrders?.filter((o) => completedStates.includes(o?.progreso)) ?? [];

    const monthlyServiceAmount = completedMonthlyOrders.reduce((acc, o) => acc + (o?.precio ?? 0), 0);

    const monthlyCommissionTotal = completedMonthlyOrders.reduce((acc, o) => {
      const basePrecio = o?.precio ?? 0;
      const commission = o?.comision ?? basePrecio * 0.01;
      return acc + commission;
    }, 0);

    const monthlyCommissionUnpaid = completedMonthlyOrders
      .filter((o) => !o?.comisionPagada)
      .reduce((acc, o) => {
        const basePrecio = o?.precio ?? 0;
        const commission = o?.comision ?? basePrecio * 0.01;
        return acc + commission;
      }, 0);
    
    // Volumen: órdenes completadas en el mes
    const totalVolume = completedMonthlyOrders.reduce((acc, o) => acc + (o?.volumen ?? 0), 0);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);
    const thirtyDaysAhead = new Date();
    thirtyDaysAhead.setDate(now.getDate() + 30);
    
    // Si es operador, solo mostrar órdenes desde hoy en adelante
    // Si es otro rol (admin, administrativo), mostrar últimos 30 días
    const isOperator = (session.user as any).role === "OPERADOR";
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const filterStartDate = isOperator ? todayStart : thirtyDaysAgo;

    // Fecha límite para mostrar pagados: hace 7 días
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(now.getDate() - 7);

    const recentOrders = orders
      ?.filter((o) => {
        const scheduled = o?.fechaProgramada ?? o?.createdAt;
        const isPagadoContabilizado = o?.progreso === "PAGO_REALIZADO_Y_CONTABILIZADO";
        const isComisionPagada = o?.comisionPagada ?? false;
        const isCommissionPending = !isOperator && completedStates.includes(o?.progreso) && !isComisionPagada;
        
        if (isCommissionPending) return true;

        // Criterio base de fechas
        const inDateRange = scheduled >= filterStartDate && scheduled <= thirtyDaysAhead;
        
        if (!inDateRange) return false;

        // Si NO es "Pago realizado y contabilizado", mostrar siempre (dentro del rango)
        if (!isPagadoContabilizado) return true;

        // Si ES "Pago realizado y contabilizado":
        // 1. Mostrar si NO está pagada la comisión (impagos)
        // 2. Mostrar si la comisión está pagada PERO fue reciente (últimos 7 días)
        // Nota: Asumimos que la fecha de pago es cercana a la fecha de actualización o scheduled.
        // Como no tenemos fecha exacta de pago de comisión, usamos la fecha programada como proxy
        // o simplemente mostramos los últimos 7 días de fecha programada.
        
        if (!isComisionPagada) return true; // Mostrar si debe comisión

        // Si ya está todo pagado, solo mostrar si es reciente (últimos 7 días)
        return scheduled >= oneWeekAgo;
      })
      ?.sort((a, b) => {
        const dateA = new Date(a?.fechaProgramada ?? a?.createdAt).getTime();
        const dateB = new Date(b?.fechaProgramada ?? b?.createdAt).getTime();
        if (dateB !== dateA) return dateB - dateA;
        const orderA = new Date(a?.createdAt).getTime();
        const orderB = new Date(b?.createdAt).getTime();
        return orderB - orderA;
      })
      ?.map((o) => {
        const basePrecio = o?.precio ?? 0;
        const commission = o?.comision ?? basePrecio * 0.01;
        return {
          id: o?.id,
          clientName: o?.client?.nombre ?? "Sin cliente",
          truckPlaca: o?.truck?.placa ?? "Sin camión",
          progreso: o?.progreso,
          precio: basePrecio,
          fechaProgramada: o?.fechaProgramada?.toISOString(),
          comision: commission,
          comisionPagada: o?.comisionPagada ?? false,
          observaciones: o?.observaciones,
          clientObservaciones: o?.client?.observaciones,
        };
      }) ?? [];

    // Pending invoices (orders with FACTURACION_PENDIENTE status)
    const pendingInvoices = orders?.filter((o) => o?.progreso === "FACTURACION_PENDIENTE")?.slice(0, 5)?.map((o) => ({
      id: o?.id,
      clientName: o?.client?.nombre ?? "Sin cliente",
      truckPlaca: o?.truck?.placa ?? "Sin camión",
      progreso: o?.progreso,
      precio: o?.precio ?? 0,
      fechaProgramada: o?.fechaProgramada?.toISOString(),
    })) ?? [];

    return NextResponse.json({
      totalTrucks: trucks?.length ?? 0,
      totalClients: clients ?? 0,
      activeServices,
      monthlyRevenue: monthlyServiceAmount,
      totalVolume,
      monthlyCommissionTotal,
      monthlyCommissionUnpaid,
      recentOrders,
      pendingInvoices,
      trucksByStatus: {
        disponible: trucks?.filter((t) => t?.estado === "DISPONIBLE")?.length ?? 0,
        enServicio: trucks?.filter((t) => t?.estado === "EN_SERVICIO")?.length ?? 0,
        mantenimiento: trucks?.filter((t) => t?.estado === "MANTENIMIENTO")?.length ?? 0,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return NextResponse.json({ error: "Error al obtener datos" }, { status: 500 });
  }
}
