import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import dynamicLoader from "next/dynamic";

const AdministrativoDashboardClient = dynamicLoader(
  () => import("./_components/administrativo-dashboard-client").then((mod) => mod.AdministrativoDashboardClient),
  { ssr: false }
);

export const dynamic = "force-dynamic";

async function getDashboardData() {
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

  const recentOrders = orders
    ?.filter((o) => {
      // 1. Si la comisión NO está pagada, mostrar SIEMPRE.
      if (!o?.comisionPagada) return true;

      // 2. Si la comisión ESTÁ pagada, mostrar solo si es de los últimos 30 días.
      const scheduled = o?.fechaProgramada ?? o?.createdAt;
      return scheduled >= thirtyDaysAgo;
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

  return {
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
  };
}

export default async function AdministrativoDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  // Optional: Restrict access if strictly needed, but sidebar control might be enough for now.
  // if (session.user.role !== "ADMINISTRATIVO" && session.user.role !== "ADMIN") {
  //   redirect("/dashboard");
  // }

  const data = await getDashboardData();

  return <AdministrativoDashboardClient data={data} />;
}
