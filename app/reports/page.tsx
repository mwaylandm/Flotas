"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { 
  BarChart3, 
  Calendar as CalendarIcon,
  DollarSign,
  Users,
  Truck,
  Activity,
  Download
} from "lucide-react";

import { SalesReport } from "./_components/sales-report";
import { CommissionReport } from "./_components/commission-report";
import { ClientReport } from "./_components/client-report";
import { FleetReport } from "./_components/fleet-report";
import { DaysReport } from "./_components/days-report";
import { DashboardLayout } from "../../components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { es as localeEs } from "date-fns/locale";

export default function ReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // Default: 30 days ago to Today
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  const [activeTab, setActiveTab] = useState("sales");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && (session?.user as any).role !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  useEffect(() => {
    if (status === "authenticated" && (session?.user as any).role === "ADMIN") {
      fetchReports();
    }
  }, [startDate, endDate, status, session]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?startDate=${startDate}&endDate=${endDate}`);
      if (res.ok) {
        const jsonData = await res.json();
        setData(jsonData);
      }
    } catch (error) {
      console.error("Error loading reports:", error);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <DashboardLayout>
        <div className="flex h-[80vh] items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500 font-medium">Cargando reportes...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const tabs = [
    { id: "sales", label: "Ventas", icon: DollarSign },
    { id: "commissions", label: "Comisiones", icon: Activity },
    { id: "clients", label: "Clientes", icon: Users },
    { id: "fleet", label: "Flota", icon: Truck },
    { id: "days", label: "Días", icon: CalendarIcon },
  ];

  const isoToDDMMYYYY = (iso: string) => {
    const datePart = iso.includes("T") ? iso.split("T")[0] : iso;
    const [yyyy, mm, dd] = datePart.split("-");
    if (!yyyy || !mm || !dd) return "";
    return `${dd.padStart(2, "0")}/${mm.padStart(2, "0")}/${yyyy}`;
  };

  const isoToDate = (iso: string) => {
    const datePart = iso.includes("T") ? iso.split("T")[0] : iso;
    const [yyyy, mm, dd] = datePart.split("-").map(Number);
    if (!yyyy || !mm || !dd) return undefined;
    const d = new Date(yyyy, mm - 1, dd);
    return isNaN(d.getTime()) ? undefined : d;
  };

  const dateToISO = (date: Date) => {
    const yyyy = String(date.getFullYear());
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header & Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-blue-600" />
              Reportes
            </h1>
            <p className="text-gray-500 mt-1">Análisis y métricas del negocio</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-end sm:items-center">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Desde</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4 text-gray-500" />
                    {isoToDDMMYYYY(startDate)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" align="end">
                  <CalendarUI
                    mode="single"
                    locale={localeEs}
                    selected={isoToDate(startDate)}
                    onSelect={(date) => {
                      if (!date) return;
                      const next = dateToISO(date as Date);
                      setStartDate(next);
                      if (next > endDate) setEndDate(next);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Hasta</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4 text-gray-500" />
                    {isoToDDMMYYYY(endDate)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" align="end">
                  <CalendarUI
                    mode="single"
                    locale={localeEs}
                    selected={isoToDate(endDate)}
                    onSelect={(date) => {
                      if (!date) return;
                      const next = dateToISO(date as Date);
                      setEndDate(next);
                      if (next < startDate) setStartDate(next);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            {/* <button className="h-10 px-4 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm font-medium shadow-sm">
              <Download className="w-4 h-4" />
              Exportar
            </button> */}
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="flex overflow-x-auto pb-2 gap-2 border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-t-xl font-medium transition-all whitespace-nowrap relative ${
                activeTab === tab.id
                  ? "text-blue-600 bg-white shadow-sm border-x border-t border-gray-100 z-10"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100/50"
              }`}
            >
              <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? "text-blue-600" : "text-gray-400"}`} />
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-[-1px] left-0 w-full h-1 bg-white" />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {data && (
            <>
              {activeTab === "sales" && <SalesReport data={data.sales} />}
              {activeTab === "commissions" && <CommissionReport data={data.commissions} />}
              {activeTab === "clients" && <ClientReport data={data.clients} />}
              {activeTab === "fleet" && <FleetReport data={data.fleet} />}
              {activeTab === "days" && <DaysReport data={data.days} />}
            </>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
}
