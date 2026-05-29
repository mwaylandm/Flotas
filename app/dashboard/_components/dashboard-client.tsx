"use client";
import { DashboardLayout } from "../../../components/dashboard-layout";
import { motion } from "framer-motion";
import {
  Truck,
  Activity,
  DollarSign,
  Droplets,
  TrendingUp,
  Calendar,
  ArrowUpRight,
  FileText,
  ClipboardList,
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  Phone,
  MapPin,
  CreditCard,
  Eye,
  Users,
} from "lucide-react";
import { StatusBadge } from "../../../components/ui/status-badge";
import { ProgressBar } from "../../../components/ui/progress-bar";
import { Modal } from "../../../components/ui/modal";
import { useInView } from "react-intersection-observer";
import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import type { ServiceOrder, Truck as TruckType, Client, FosaType, PaymentMethod } from "@/lib/types";

// Opciones de progreso para operadores
const progresoOptionsOperador = [
  { value: "PENDIENTE", label: "Pendiente" },
  { value: "EN_CAMINO", label: "En Camino" },
  { value: "OPERANDO", label: "Operando" },
  { value: "COMPLETADO", label: "Completada" },
];

// Estados que solo el admin puede editar
const estadosSoloAdmin = ["COMPLETADO", "FACTURACION_PENDIENTE", "FACTURACION_TERMINADA", "TERMINADA_CONTABILIZADA", "PAGO_REALIZADO_Y_CONTABILIZADO"];

const formaPagoOptions = [
  { value: "EFECTIVO", label: "Efectivo" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
  { value: "PAGO_ELECTRONICO", label: "Pago electrónico" },
];

const progresoLabels: Record<string, string> = {
  PENDIENTE: "Pendiente",
  EN_CAMINO: "En Camino",
  OPERANDO: "Operando",
  COMPLETADO: "Completada",
  FACTURACION_PENDIENTE: "Facturación Pendiente",
  FACTURACION_TERMINADA: "En proceso de facturación",
  TERMINADA_CONTABILIZADA: "Facturada y enviada",
  PAGO_REALIZADO_Y_CONTABILIZADO: "Pago realizado y contabilizado",
};

const tipoFosaLabels: Record<string, string> = {
  SEPTICA: "Séptica",
  AGUAS_GRISES: "Aguas Grises",
  INDUSTRIAL: "Industrial",
};

const formaPagoLabels: Record<string, string> = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",
  PAGO_ELECTRONICO: "Pago electrónico",
  FACTURACION: "Facturación",
};

interface DashboardData {
  totalTrucks: number;
  totalClients: number;
  activeServices: number;
  monthlyRevenue: number;
  totalVolume: number;
  monthlyCommissionTotal?: number;
  monthlyCommissionUnpaid?: number;
  recentOrders: Array<{
    id: string;
    clientName: string;
    truckPlaca: string;
    progreso: string;
    precio: number;
    fechaProgramada: string;
    comision?: number;
    comisionPagada?: boolean;
    observaciones?: string;
    clientObservaciones?: string;
  }>;
  pendingInvoices: Array<{
    id: string;
    clientName: string;
    truckPlaca: string;
    progreso: string;
    precio: number;
    fechaProgramada: string;
  }>;
  trucksByStatus: {
    disponible: number;
    enServicio: number;
    mantenimiento: number;
  };
}

function AnimatedCounter({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0);
  const { ref, inView } = useInView({ triggerOnce: true });

  useEffect(() => {
    if (inView) {
      let startTimestamp: number | null = null;
      const duration = 1500; // Duración un poco más larga para suavidad
      
      const step = (timestamp: number) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        
        // Función de suavizado (ease out quart)
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        
        // Calcular valor actual
        const current = value * easeOutQuart;
        
        if (progress < 1) {
          setDisplayValue(current);
          window.requestAnimationFrame(step);
        } else {
          setDisplayValue(value);
        }
      };
      
      window.requestAnimationFrame(step);
    }
  }, [inView, value]);

  return (
    <span ref={ref}>
      {prefix}{Math.floor(displayValue).toLocaleString()}{suffix}
    </span>
  );
}



export function DashboardClient({ data: initialData }: { data: DashboardData }) {
  const { data: session } = useSession() || {};
  const userRole = (session?.user as { role?: string })?.role;
  const isOperador = userRole === "OPERADOR";
  const isAdministrativo = userRole === "ADMINISTRATIVO";
  const isAdmin = userRole === "ADMIN";



  const [data, setData] = useState<DashboardData>(initialData);

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  // Función para formatear fechas en formato chileno (DD/MM/YYYY) sin desfase
  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return "N/A";
    // Crear fecha asumiendo que viene en UTC (ISO string)
    const date = new Date(dateString);
    // Ajustar a la zona horaria de Chile (UTC-4 o UTC-3) o simplemente usar UTC para mostrar
    // Dado que las fechas se guardan como ISO, al mostrarlas con toLocaleDateString
    // el navegador las convierte a la zona local. Si el servidor las guarda como UTC mediodía,
    // deberían mostrarse bien. Si se guardan como UTC 00:00, en Chile (UTC-4) será el día anterior.
    
    // Solución robusta: Asumir que la fecha representa un día específico y mostrar ese día
    // extrayendo componentes UTC para evitar el ajuste de zona horaria local que resta horas.
    return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()).toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  };

  const isoToDDMMYYYY = (iso?: string | null) => {
    if (!iso) return "";
    const part = iso.includes("T") ? iso.split("T")[0] : iso;
    const [y, m, d] = part.split("-");
    if (!y || !m || !d) return "";
    return `${d.padStart(2, "0")}-${m.padStart(2, "0")}-${y}`;
  };

  // Estados para servicios (solo operador)
  const [orders, setOrders] = useState<ServiceOrder[]>([]);



  const [trucks, setTrucks] = useState<TruckType[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ServiceOrder | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [formData, setFormData] = useState({
    truckId: "",
    clientId: "",
    volumen: "",
    precio: "",
    progreso: "PENDIENTE",
    fechaProgramada: "",
    telefono: "",
    direccion: "",
    latitud: 0,
    longitud: 0,
    tipoFosa: "" as FosaType | "",
    observaciones: "",
    clienteObservaciones: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [clientSearch, setClientSearch] = useState("");
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const clientDropdownRef = useRef<HTMLDivElement>(null);
  const [originalClientVolumen, setOriginalClientVolumen] = useState<number | null>(null);
  const [originalClientPrecio, setOriginalClientPrecio] = useState<number | null>(null);
  const [originalClientData, setOriginalClientData] = useState<{
    telefono: string;
    direccion: string;
    latitud: number;
    longitud: number;
    tipoFosa: string;
  } | null>(null);

  // Estados para modal de pago
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [payingOrder, setPayingOrder] = useState<ServiceOrder | null>(null);
  const [paymentData, setPaymentData] = useState({
    formaPago: "EFECTIVO" as PaymentMethod,
    referencia: "",
  });
  const [savingPayment, setSavingPayment] = useState(false);
  const [togglingCommissionId, setTogglingCommissionId] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState("");

  // Función para refrescar datos del dashboard
  const refreshData = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard");
      if (res.ok) {
        const newData = await res.json();
        setData(newData);
      }
    } catch (e) {
      console.error("Error refreshing dashboard:", e);
    }
  }, []);

  // Función para cargar servicios (operador y admin)
  const fetchServicesData = useCallback(async () => {
    try {
      const [ordersRes, trucksRes, clientsRes] = await Promise.all([
        fetch("/api/service-orders"),
        fetch("/api/trucks"),
        fetch("/api/clients"),
      ]);
      if (ordersRes.ok) setOrders(await ordersRes.json());
      if (trucksRes.ok) setTrucks(await trucksRes.json());
      if (clientsRes.ok) { const clientsData = await clientsRes.json(); setClients(clientsData.sort((a: any, b: any) => a.nombre.localeCompare(b.nombre))); }
    } catch (e) {
      console.error("Error fetching services:", e);
    } finally {
      setLoadingServices(false);
    }
  }, []);

  useEffect(() => {
    const handleDataUpdate = () => {
      refreshData();
      fetchServicesData();
    };

    window.addEventListener("aquaflow-data-updated", handleDataUpdate);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") handleDataUpdate();
    });
    window.addEventListener("focus", handleDataUpdate);

    fetchServicesData();

    // Polling cada 15 segundos para sincronización entre dispositivos
    const pollInterval = setInterval(() => {
      refreshData();
      fetchServicesData();
    }, 15000);

    return () => {
      window.removeEventListener("aquaflow-data-updated", handleDataUpdate);
      clearInterval(pollInterval);
    };
  }, [refreshData, fetchServicesData]);

  // Cerrar dropdown de cliente al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(e.target as Node)) {
        setIsClientDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const commissionRelevantStates = ["COMPLETADO", "FACTURACION_PENDIENTE", "FACTURACION_TERMINADA", "TERMINADA_CONTABILIZADA", "PAGO_REALIZADO_Y_CONTABILIZADO"];

  // Filtrar órdenes para operador
  const filteredOrders = orders?.filter((o) => {
    const endBoundary = new Date();
    endBoundary.setHours(23, 59, 59, 999);
    const startBoundary = new Date(endBoundary);
    startBoundary.setDate(endBoundary.getDate() - 29);
    startBoundary.setHours(0, 0, 0, 0);
    const scheduled = o?.fechaProgramada ? new Date(o.fechaProgramada) : new Date(o.createdAt);
    if (isNaN(scheduled.getTime())) return false;
    const isCommissionPending = !isOperador && commissionRelevantStates.includes(o?.progreso ?? "") && !o?.comisionPagada;
    if (!isCommissionPending && (scheduled < startBoundary || scheduled > endBoundary)) return false;
    // Operadores solo ven: Pendiente, En Camino, Operando, Completada y Facturación Pendiente
    if (isOperador) {
      const allowedStatuses = ["PENDIENTE", "EN_CAMINO", "OPERANDO", "COMPLETADO", "FACTURACION_PENDIENTE"];
      if (!allowedStatuses.includes(o?.progreso ?? "")) {
        return false;
      }
    } else {
      if (o?.comisionPagada) {
        const scheduled = o?.fechaProgramada ? new Date(o.fechaProgramada) : new Date(o.createdAt);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        if (scheduled < thirtyDaysAgo && o?.pagado) {
          return false;
        }
      }
    }
    return (
      o?.client?.nombre?.toLowerCase()?.includes(searchTerm?.toLowerCase()) ||
      o?.truck?.placa?.toLowerCase()?.includes(searchTerm?.toLowerCase())
    );
  }) ?? [];

  // Calcular ingresos y volumen basado en órdenes visibles
  const completedStates = ["COMPLETADO", "FACTURACION_PENDIENTE", "FACTURACION_TERMINADA", "TERMINADA_CONTABILIZADA", "PAGO_REALIZADO_Y_CONTABILIZADO"];
  
  // Ingresos: contar órdenes completadas (devengado), independientemente del pago
  const operadorIngresos = filteredOrders.filter((o) => completedStates.includes(o?.progreso)).reduce((sum, o) => sum + (o?.precio ?? 0), 0);
  
  // Volumen: igual que ingresos, órdenes completadas
  const operadorVolumen = filteredOrders.filter((o) => completedStates.includes(o?.progreso)).reduce((sum, o) => sum + (o?.volumen ?? 0), 0);

  // Total Servicios (Admin/General): suma de todas las órdenes visibles en el listado
  const totalServicesRevenue = filteredOrders.reduce((sum, o) => sum + (o?.precio ?? 0), 0);

  // Total Comisiones (Admin/General): suma de comisiones de órdenes visibles
  const totalCommission = filteredOrders.reduce((sum, o) => {
    const commission = o?.comision ?? (o?.precio ?? 0) * 0.01;
    return sum + commission;
  }, 0);

  // Comisiones por pagar (Admin/General): suma de comisiones impagas de órdenes visibles
  const unpaidCommission = filteredOrders
    .filter(o => !o?.comisionPagada)
    .reduce((sum, o) => {
      const commission = o?.comision ?? (o?.precio ?? 0) * 0.01;
      return sum + commission;
    }, 0);

  // Calcular rango de fechas de las órdenes visibles
  const dateRangeString = (() => {
    if (filteredOrders.length === 0) return "Sin datos";
    
    // Obtener todas las fechas (programada o creación)
    const dates = filteredOrders.map(o => o.fechaProgramada ? new Date(o.fechaProgramada) : new Date(o.createdAt));
    
    // Encontrar min y max
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    // Formatear: DD/MM/YYYY
    const format = (d: Date) => d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    
    return `${format(minDate)} - ${format(maxDate)}`;
  })();

  const formatDateForInput = (dateStr: string | undefined) => {
    if (!dateStr) return "";
    try {
      return new Date(dateStr).toISOString().split("T")[0];
    } catch {
      return "";
    }
  };

  // Funciones del modal de servicios (igual que services-client/administrativo)
  const openModal = async (order?: ServiceOrder, viewOnly = false) => {
    setIsViewMode(viewOnly);
    setClientSearch("");
    setIsClientDropdownOpen(false);
    try {
      if (trucks.length === 0) {
        const tr = await fetch("/api/trucks");
        if (tr.ok) setTrucks(await tr.json());
      }
      if (clients.length === 0) {
        const cl = await fetch("/api/clients");
        if (cl.ok) {
          const clientsData = await cl.json();
          setClients(clientsData.sort((a: any, b: any) => a.nombre.localeCompare(b.nombre)));
        }
      }
    } catch {}
    if (order) {
      setEditingOrder(order);
      const client = clients.find(c => c.id === order.clientId);
      const isCompleted = order?.progreso === "COMPLETADO" || order?.progreso === "FACTURACION_PENDIENTE";
      if (client) {
        setClientSearch(client.nombre);
      } else if (order?.client?.nombre) {
        setClientSearch(order.client.nombre);
      }
      
      setFormData({
        truckId: order?.truckId ?? "",
        clientId: order?.clientId ?? "",
        volumen: String(order?.volumen ?? ""),
        precio: String(order?.precio ?? ""),
        progreso: order?.progreso ?? "PENDIENTE",
        fechaProgramada: formatDateForInput(order?.fechaProgramada),
        telefono: order?.telefono ?? client?.telefono ?? "",
        direccion: order?.direccion ?? client?.direccion ?? "",
        latitud: order?.latitud ?? client?.latitud ?? 0,
        longitud: order?.longitud ?? client?.longitud ?? 0,
        tipoFosa: (order?.tipoFosa || client?.tipoFosa) ?? "",
        observaciones: order?.observaciones ?? "",
        clienteObservaciones: client?.observaciones ?? "",
      });
      setOriginalClientVolumen(client?.volumen ?? null);
      setOriginalClientPrecio(client?.precio ?? null);
      setOriginalClientData(client ? {
        telefono: client.telefono ?? "",
        direccion: client.direccion ?? "",
        latitud: client.latitud ?? 0,
        longitud: client.longitud ?? 0,
        tipoFosa: client.tipoFosa ?? "",
      } : null);
    } else {
      setEditingOrder(null);
      setFormData({
        truckId: "",
        clientId: "",
        volumen: "",
        precio: "",
        progreso: "PENDIENTE",
        fechaProgramada: new Date().toISOString().split("T")[0],
        telefono: "",
        direccion: "",
        latitud: 0,
        longitud: 0,
        tipoFosa: "",
        observaciones: "",
        clienteObservaciones: "",
      });
      setOriginalClientVolumen(null);
      setOriginalClientPrecio(null);
      setOriginalClientData(null);
    }
    setError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingOrder(null);
    setIsViewMode(false);
  };

  const handleClientChange = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setFormData({
        ...formData,
        clientId,
        volumen: String(client.volumen ?? 0),
        precio: String(client.precio ?? 0),
        telefono: client.telefono ?? "",
        direccion: client.direccion ?? "",
        latitud: client.latitud ?? 0,
        longitud: client.longitud ?? 0,
        tipoFosa: client.tipoFosa ?? "",
        clienteObservaciones: client.observaciones ?? "",
      });
      setOriginalClientVolumen(client.volumen ?? 0);
      setOriginalClientPrecio(client.precio ?? 0);
      setOriginalClientData({
        telefono: client.telefono ?? "",
        direccion: client.direccion ?? "",
        latitud: client.latitud ?? 0,
        longitud: client.longitud ?? 0,
        tipoFosa: client.tipoFosa ?? "",
      });
    } else {
      setFormData({
        ...formData,
        clientId: "",
        volumen: "",
        precio: "",
        telefono: "",
        direccion: "",
        latitud: 0,
        longitud: 0,
        tipoFosa: "",
        clienteObservaciones: "",
      });
      setOriginalClientVolumen(null);
      setOriginalClientPrecio(null);
      setOriginalClientData(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const url = editingOrder ? `/api/service-orders/${editingOrder.id}` : "/api/service-orders";
      const method = editingOrder ? "PUT" : "POST";

      const volumenChanged = originalClientVolumen !== null && Number(formData.volumen) !== originalClientVolumen;
      const precioChanged = originalClientPrecio !== null && Number(formData.precio) !== originalClientPrecio;

      const contactChanged = originalClientData && (
        formData.telefono !== originalClientData.telefono ||
        formData.direccion !== originalClientData.direccion ||
        formData.latitud !== originalClientData.latitud ||
        formData.longitud !== originalClientData.longitud ||
        formData.tipoFosa !== originalClientData.tipoFosa
      );

      const updateClientData = volumenChanged || precioChanged || contactChanged;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          updateClientData,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Error al guardar");
        return;
      }

      closeModal();
      fetchServicesData();
      refreshData();
      window.dispatchEvent(new CustomEvent("aquaflow-data-updated"));
    } catch (e) {
      setError("Error al guardar orden");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string | undefined) => {
    if (!id || !confirm("¿Eliminar esta orden?")) return;
    try {
      const res = await fetch(`/api/service-orders/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchServicesData();
        refreshData();
        window.dispatchEvent(new CustomEvent("aquaflow-data-updated"));
      }
    } catch (e) {
      console.error("Error:", e);
    }
  };

  const handleToggleCommissionPaid = async (id: string | undefined, currentPaid?: boolean) => {
    if (!id || currentPaid || togglingCommissionId === id) return;
    setTogglingCommissionId(id);
    try {
      const res = await fetch(`/api/service-orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comisionPagada: true }),
      });
      if (res.ok) {
        await refreshData();
      }
    } catch (e) {
      console.error("Error updating commission payment:", e);
    } finally {
      setTogglingCommissionId(null);
    }
  };

  const handleViewRecentOrder = async (id: string) => {
    try {
      const res = await fetch(`/api/service-orders/${id}`);
      const order = await res.json();
      if (res.ok && order) {
        openModal(order, true);
      }
    } catch {}
  };

  // Función para avanzar al siguiente estado
  const getNextProgress = (currentProgress: string) => {
    const progressFlow: Record<string, string> = {
      PENDIENTE: "EN_CAMINO",
      EN_CAMINO: "OPERANDO",
      OPERANDO: "COMPLETADO",
    };
    return progressFlow[currentProgress] || null;
  };

  const getProgressButtonConfig = (currentProgress: string) => {
    const config: Record<string, { label: string; bgColor: string; hoverColor: string }> = {
      PENDIENTE: { label: "Marcar En Camino", bgColor: "bg-amber-500", hoverColor: "hover:bg-amber-600" },
      EN_CAMINO: { label: "Marcar Operando", bgColor: "bg-blue-500", hoverColor: "hover:bg-blue-600" },
      OPERANDO: { label: "Marcar Completada", bgColor: "bg-green-500", hoverColor: "hover:bg-green-600" },
    };
    return config[currentProgress] || null;
  };

  const handleAdvanceProgress = async (order: ServiceOrder) => {
    const nextProgress = getNextProgress(order?.progreso ?? "");
    if (!nextProgress) return;

    // Si va a COMPLETADO, verificar que esté pagado
    if (nextProgress === "COMPLETADO" && !order?.pagado && !isClientePersonaJuridica(order)) {
      alert("Debe registrar el pago antes de completar la orden.");
      return;
    }

    try {
      const res = await fetch(`/api/service-orders/${order?.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progreso: nextProgress }),
      });
      if (res.ok) {
        fetchServicesData();
        refreshData();
        window.dispatchEvent(new CustomEvent("aquaflow-data-updated"));
      } else {
        const data = await res.json();
        alert(data?.error || "Error al actualizar estado");
      }
    } catch (e) {
      console.error("Error:", e);
    }
  };

  // Funciones de pago
  const openPaymentModal = (order: ServiceOrder) => {
    setPayingOrder(order);
    setPaymentData({
      formaPago: order?.formaPago ?? "EFECTIVO",
      referencia: order?.referencia ?? "",
    });
    setPaymentError("");
    setIsPaymentModalOpen(true);
  };

  const closePaymentModal = () => {
    setIsPaymentModalOpen(false);
    setPayingOrder(null);
  };

  const setCommissionPaid = async (orderId: string, paid: boolean) => {
    try {
      const res = await fetch(`/api/service-orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comisionPagada: paid }),
      });
      if (res.ok) {
        fetchServicesData();
        refreshData();
        window.dispatchEvent(new CustomEvent("aquaflow-data-updated"));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const isClientePersonaJuridica = (order: ServiceOrder | null) => {
    if (!order) return false;
    // Check if client data is populated in the order
    if (order.client && order.client.tipoCliente === "EMPRESA") return true;
    // Fallback to finding in the clients list
    const client = clients.find((c) => c.id === order.clientId);
    return client?.tipoCliente === "EMPRESA";
  };

  const getPaymentOptions = () => {
    const opts = [...formaPagoOptions];
    if (isClientePersonaJuridica(payingOrder)) {
      opts.push({ value: "FACTURACION", label: "Facturación" });
    }
    return opts;
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingOrder) return;
    setSavingPayment(true);
    setPaymentError("");
    try {
      const res = await fetch(`/api/service-orders/${payingOrder.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentData),
      });
      const data = await res.json();
      if (!res.ok) {
        setPaymentError(data?.error || "Error al procesar pago");
        return;
      }
      closePaymentModal();
      fetchServicesData();
      refreshData();
      window.dispatchEvent(new CustomEvent("aquaflow-data-updated"));
    } catch {
      setPaymentError("Error al procesar pago");
    } finally {
      setSavingPayment(false);
    }
  };

  // Stats para admin
  // Calcular métricas dinámicas basadas en filteredOrders para coherencia total
  const totalServicesCount = filteredOrders.length;
  const totalVolumeVisible = filteredOrders.reduce((sum, o) => sum + (o?.volumen ?? 0), 0);

  const stats = [
    {
      name: "Total Camiones",
      value: data?.totalTrucks ?? 0,
      icon: Truck,
      color: "from-cyan-500 to-cyan-600",
      bgColor: "bg-cyan-50",
      iconColor: "text-cyan-600",
    },
    {
      name: "Órdenes de servicio",
      value: totalServicesCount,
      icon: Activity,
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      name: "Monto servicios",
      value: totalServicesRevenue,
      icon: DollarSign,
      color: "from-green-500 to-green-600",
      bgColor: "bg-green-50",
      iconColor: "text-green-600",
      prefix: "$",
    },
    {
      name: "Volumen Procesado",
      value: totalVolumeVisible,
      icon: Droplets,
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-50",
      iconColor: "text-purple-600",
      suffix: " L",
    },
  ];

  // VISTA OPERADOR
  if (isOperador) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
              <p className="text-gray-600 mt-1">Panel de operaciones</p>
            </div>

          </div>

          {/* Stats para operador: solo Ingresos y Volumen */}
          <div className="grid grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-xl bg-green-50">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <ArrowUpRight className="w-5 h-5 text-gray-400" />
              </div>
              <div className="mt-4">
                <h3 className="text-sm text-gray-500 font-medium">Ingresos</h3>
                <p className="text-2xl font-bold text-gray-800 mt-1">
                  <AnimatedCounter value={operadorIngresos} prefix="$" />
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-xl bg-purple-50">
                  <Droplets className="w-6 h-6 text-purple-600" />
                </div>
                <ArrowUpRight className="w-5 h-5 text-gray-400" />
              </div>
              <div className="mt-4">
                <h3 className="text-sm text-gray-500 font-medium">Volumen Procesado</h3>
                <p className="text-2xl font-bold text-gray-800 mt-1">
                  <AnimatedCounter value={operadorVolumen} suffix=" L" />
                </p>
              </div>
            </motion.div>
          </div>

          {/* Listado completo de servicios */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <ClipboardList className="w-6 h-6 text-cyan-600" />
                Órdenes de Servicio
              </h2>
              {!isOperador && (
                <div className="flex gap-3">
                  <button
                    onClick={() => openModal()}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl hover:from-cyan-700 hover:to-blue-700 transition-all shadow-lg"
                  >
                    <Plus className="w-5 h-5" />
                    <span className="font-medium">Nueva orden de servicio</span>
                  </button>
                </div>
              )}
            </div>

            {loadingServices ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600" />
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No hay órdenes de servicio</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredOrders.map((order, i) => (
                  <motion.div
                    key={order?.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow p-6 border border-gray-100"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Users className="w-4 h-4 text-gray-400" />
                          <h3 className="font-bold text-lg text-gray-800">
                            {order?.client?.nombre ?? "Sin cliente"}
                          </h3>
                        </div>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Truck className="w-4 h-4" />
                            <span>Camión: {order?.truck?.placa ?? "N/A"}</span>
                          </div>
                          {/* Client Observations */}
                          {order?.client?.observaciones && (
                            <div className="flex items-start gap-2 text-sm text-gray-500 mt-1">
                              <FileText className="w-4 h-4 mt-0.5" />
                              <span className="italic line-clamp-2">"{order.client.observaciones}"</span>
                            </div>
                          )}
                          {/* Service Observations */}
                          {order?.observaciones && (
                            <div className="flex items-start gap-2 text-sm text-gray-500 mt-1">
                              <ClipboardList className="w-4 h-4 mt-0.5" />
                              <span className="italic line-clamp-2">Servicio: "{order.observaciones}"</span>
                            </div>
                          )}
                        </div>
                      <StatusBadge status={order?.progreso ?? "PENDIENTE"} variant="progress" />
                    </div>

                    <div className={`grid gap-4 mb-4 text-sm ${isOperador ? "grid-cols-3" : "grid-cols-4"}`}>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center gap-1 text-gray-500 mb-1">
                          <Droplets className="w-4 h-4" />
                          Volumen
                        </div>
                        <p className="font-semibold">{(order?.volumen ?? 0)?.toLocaleString()} L</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center gap-1 text-gray-500 mb-1">
                          <DollarSign className="w-4 h-4" />
                          Precio
                        </div>
                        <p className="font-semibold">${(order?.precio ?? 0)?.toLocaleString()}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center gap-1 text-gray-500 mb-1">
                          <Calendar className="w-4 h-4" />
                          Fecha
                        </div>
                        <p className="font-semibold">{formatDate(order?.fechaProgramada)}</p>
                      </div>
                      {!isOperador && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="flex items-center gap-1 text-gray-500 mb-1">
                            <DollarSign className="w-4 h-4" />
                            Comisión
                          </div>
                          <p className="font-semibold">
                            ${((order?.comision ?? (order?.precio ?? 0) * 0.01) || 0).toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>


                    <ProgressBar 
                      progress={order?.progreso ?? "PENDIENTE"} 
                      isJuridica={isClientePersonaJuridica(order)}
                    />

                    {order?.pagado ? (
                      <div className="mt-2 flex items-center gap-2 text-sm">
                        <CreditCard className="w-4 h-4 text-green-600" />
                        <span className="text-green-600 font-medium">
                          Pagado: {formaPagoLabels[order?.formaPago ?? ""] ?? order?.formaPago}
                          {order?.referencia && ` - Ref: ${order.referencia}`}
                        </span>
                      </div>
                    ) : (
                      <div className="mt-2 flex items-center gap-2 text-sm">
                        <span className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full text-xs font-medium bg-red-600 text-white">
                          <span className="w-2.5 h-2.5 rounded-full bg-white/90" />
                          Por pagar
                        </span>
                        {!order?.comisionPagada && (
                          <span className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full text-xs font-medium bg-red-600 text-white">
                            <span className="w-2.5 h-2.5 rounded-full bg-white/90" />
                            Comisión impaga
                          </span>
                        )}
                        {order?.comisionPagada && (
                          <span className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-600 text-white">
                            <span className="w-2.5 h-2.5 rounded-full bg-white/90" />
                            Comisión pagada
                          </span>
                        )}
                      </div>
                    )}

                    <div className="mt-4 pt-4 border-t space-y-3">
                      <div className="flex gap-2">
                        {(() => {
                          const esEstadoSoloAdmin = estadosSoloAdmin.includes(order?.progreso ?? "");
                          const isActiveForOperador = ["PENDIENTE", "EN_CAMINO", "OPERANDO"].includes(order?.progreso ?? "");
                          
                          // Permitir pagar comisión SOLO en estos estados específicos
                          const showCommissionButton = !isOperador && [
                            "COMPLETADO",
                            "PAGO_REALIZADO_Y_CONTABILIZADO"
                          ].includes(order?.progreso ?? "");

                          return (
                            <>
                              {showCommissionButton && (
                                !order?.comisionPagada ? (
                                  <button
                                    onClick={() => setCommissionPaid(order.id, true)}
                                    className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                  >
                                    <CreditCard className="w-4 h-4" />
                                    Pagar comisión
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setCommissionPaid(order.id, false)}
                                    className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                  >
                                    <CreditCard className="w-4 h-4" />
                                    Reversar comisión
                                  </button>
                                )
                              )}

                              {esEstadoSoloAdmin ? (
                                <button
                                  onClick={() => openModal(order, true)}
                                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                  <Eye className="w-4 h-4" />
                                  Ver
                                </button>
                              ) : (
                                <>
                                  {isActiveForOperador && (
                                    <button
                                      onClick={() => openModal(order)}
                                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                                    >
                                      <Pencil className="w-4 h-4" />
                                      Editar
                                    </button>
                                  )}
                                  {order?.progreso === "PENDIENTE" && (
                                    <button
                                      onClick={() => handleDelete(order?.id)}
                                      className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </>
                              )}
                            </>
                          );
                        })()}
                      </div>
                      {/* Botón de avanzar estado */}
                      {(() => {
                        const buttonConfig = getProgressButtonConfig(order?.progreso ?? "");
                        if (!buttonConfig) return null;
                        return (
                          <button
                            onClick={() => handleAdvanceProgress(order)}
                            className={`w-full flex items-center justify-center gap-2 px-4 py-3 text-white rounded-lg font-medium transition-colors ${buttonConfig.bgColor} ${buttonConfig.hoverColor}`}
                          >
                            {buttonConfig.label}
                          </button>
                        );
                      })()}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Modal de Orden de Servicio (igual que services) */}
          <Modal
            isOpen={isModalOpen}
            onClose={closeModal}
            title={isViewMode ? "Ver Orden" : (editingOrder ? "Editar Orden" : "Nueva Orden de Servicio")}
          >
            <form onSubmit={handleSubmit} className="space-y-4 pr-1 sm:pr-2">
              <div ref={clientDropdownRef} className="relative">
                {isViewMode &&
                  (() => {
                    const clientFromOrder = editingOrder?.client;
                    const clientFromList = editingOrder?.clientId ? clients.find((c) => c.id === editingOrder.clientId) : undefined;
                    const tipoCliente = clientFromOrder?.tipoCliente ?? clientFromList?.tipoCliente;
                    const rut = clientFromOrder?.rut ?? clientFromList?.rut;
                    const email = clientFromOrder?.email ?? clientFromList?.email;
                    if ((tipoCliente !== "EMPRESA" || !rut) && !email) return null;
                    return (
                      <>
                        {tipoCliente === "EMPRESA" && !!rut && (
                          <div className="mb-3">
                            <label className="block text-sm font-medium text-gray-700 mb-1">RUT</label>
                            <input
                              type="text"
                              value={rut}
                              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-100 cursor-not-allowed"
                              disabled
                            />
                          </div>
                        )}
                        {!!email && (
                          <div className="mb-3">
                            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                            <input
                              type="email"
                              value={email}
                              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-100 cursor-not-allowed"
                              disabled
                            />
                          </div>
                        )}
                      </>
                    );
                  })()}
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                <input
                  type="text"
                  value={clientSearch}
                  onChange={(e) => {
                    setClientSearch(e.target.value);
                    setIsClientDropdownOpen(true);
                    if (!e.target.value) {
                      handleClientChange("");
                    }
                  }}
                  onFocus={() => !isViewMode && setIsClientDropdownOpen(true)}
                  placeholder="Buscar cliente..."
                  className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent ${isViewMode || (isOperador && !!editingOrder) ? "bg-gray-100 cursor-not-allowed" : "bg-white"}`}
                  disabled={isViewMode || (isOperador && !!editingOrder)}
                />
                {!formData.clientId && !isViewMode && (
                  <input type="hidden" name="clientId" value="" required />
                )}
                {isClientDropdownOpen && !isViewMode && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    {clients
                      ?.filter((c) => c?.nombre?.toLowerCase()?.includes(clientSearch?.toLowerCase() ?? ""))
                      ?.map((c) => (
                        <button
                          key={c?.id}
                          type="button"
                          onClick={() => {
                            handleClientChange(c?.id ?? "");
                            setClientSearch(c?.nombre ?? "");
                            setIsClientDropdownOpen(false);
                          }}
                          className={`w-full px-4 py-3 text-left hover:bg-cyan-50 transition-colors ${formData.clientId === c?.id ? "bg-cyan-100 font-medium" : ""}`}
                        >
                          {c?.nombre}
                        </button>
                      ))}
                    {clients?.filter((c) => c?.nombre?.toLowerCase()?.includes(clientSearch?.toLowerCase() ?? ""))?.length === 0 && (
                      <div className="px-4 py-3 text-gray-500 text-sm">No se encontraron clientes</div>
                    )}
                  </div>
                )}
              </div>

              {/* Observaciones del cliente (solo lectura) */}
              {formData.clientId && formData.clienteObservaciones && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones del Cliente</label>
                  <div className="relative">
                    <FileText className="absolute left-4 top-3 w-5 h-5 text-gray-400" />
                    <textarea
                      value={formData.clienteObservaciones}
                      className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl bg-amber-50 text-gray-600 cursor-not-allowed resize-none"
                      rows={2}
                      disabled
                      readOnly
                    />
                  </div>
                </div>
              )}

              {/* Teléfono */}
              {formData.clientId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="tel"
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                      className={`w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent ${isViewMode ? "bg-gray-100 cursor-not-allowed" : ""}`}
                      placeholder="+56 9 1234 5678"
                      disabled={isViewMode}
                    />
                  </div>
                </div>
              )}

              {/* Dirección (solo lectura) */}
              {formData.clientId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={formData.direccion}
                      className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-100 text-gray-600 cursor-not-allowed"
                      placeholder="Dirección completa"
                      disabled
                      readOnly
                    />
                  </div>
                </div>
              )}



              {/* Tipo de Fosa */}
              {formData.clientId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Fosa</label>
                  <select
                    value={formData.tipoFosa}
                    onChange={(e) => setFormData({ ...formData, tipoFosa: e.target.value as any })}
                    className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent ${isViewMode ? "bg-gray-100 cursor-not-allowed" : "bg-white"}`}
                    disabled={isViewMode}
                  >
                    <option value="">Seleccionar tipo</option>
                    {Object.entries(tipoFosaLabels).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Camión</label>
                {!isViewMode ? (
                  <select
                    value={formData.truckId}
                    onChange={(e) => setFormData({ ...formData, truckId: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white"
                    required
                  >
                    <option value="">Seleccionar camión</option>
                    {trucks?.filter((t) => t?.estado === "DISPONIBLE" || t?.id === formData.truckId)?.map((t) => (
                      <option key={t?.id} value={t?.id}>
                        {t?.placa} - {(t?.capacidad ?? 0)?.toLocaleString()}L
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={
                      (() => {
                        const t = trucks.find((t) => t.id === formData.truckId);
                        if (t) return `${t.placa} - ${(t.capacidad ?? 0).toLocaleString()}L`;
                        if (editingOrder?.truck) {
                          return `${editingOrder.truck.placa} - ${(editingOrder.truck?.capacidad ?? 0).toLocaleString()}L`;
                        }
                        return "N/A";
                      })()
                    }
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-100 text-gray-600 cursor-not-allowed"
                    disabled
                    readOnly
                  />
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Volumen (L)</label>
                  <input
                    type="number"
                    value={formData.volumen}
                    onChange={(e) => setFormData({ ...formData, volumen: e.target.value })}
                    className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent ${isViewMode ? "bg-gray-100 cursor-not-allowed" : ""}`}
                    placeholder="4000"
                    required
                    disabled={isViewMode}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio ($)</label>
                  <input
                    type="number"
                    value={formData.precio}
                    onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
                    className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent ${isViewMode ? "bg-gray-100 cursor-not-allowed" : ""}`}
                    placeholder="150000"
                    required
                    disabled={isViewMode}
                  />
                </div>
              </div>

              {/* Observaciones de la orden de servicio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones de la Orden</label>
                <textarea
                  value={formData.observaciones}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                  className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none ${isViewMode ? "bg-gray-100 cursor-not-allowed" : ""}`}
                  placeholder="Notas adicionales sobre esta orden de servicio..."
                  rows={2}
                  disabled={isViewMode}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                {isOperador ? (
                  <input
                    type="text"
                    value={progresoOptionsOperador.find(opt => opt.value === formData.progreso)?.label || formData.progreso}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-100 text-gray-600 cursor-not-allowed"
                    disabled
                    readOnly
                  />
                ) : (!isViewMode ? (
                  <select
                    value={formData.progreso}
                    onChange={(e) => setFormData({ ...formData, progreso: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white"
                  >
                    {progresoOptionsOperador.map((opt) => (
                      <option key={opt?.value} value={opt?.value}>
                        {opt?.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={progresoLabels?.[formData.progreso as string] ?? formData.progreso}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-100 text-gray-600 cursor-not-allowed"
                    disabled
                    readOnly
                  />
                ))}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Programada</label>
                <input
                  type="text"
                  value={isoToDDMMYYYY(formData.fechaProgramada)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-100 text-gray-600 cursor-not-allowed"
                  disabled
                  readOnly
                />
              </div>
              {/* Bitácora de cambios (solo si hay logs) */}
              {editingOrder?.logs && editingOrder.logs.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-gray-500" />
                    Historial de Cambios
                  </h3>
                  <div className="space-y-4">
                    {editingOrder.logs.map((log) => (
                      <div key={log.id} className="flex gap-3 text-sm">
                        <div className="min-w-24 text-gray-500 text-xs pt-1">
                          {new Date(log.timestamp).toLocaleString("es-CL")}
                        </div>
                        <div className="flex-1">
                          <p className="text-gray-900 font-medium">
                            {log.user?.name || log.user?.email || "Usuario desconocido"}
                          </p>
                          <p className="text-gray-600">
                            Cambió estado de <span className="font-medium text-gray-800">{log.previousStatus}</span> a <span className="font-medium text-cyan-600">{log.newStatus}</span>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>
              )}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className={`${isViewMode ? "w-full" : "flex-1"} px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors`}
                >
                  {isViewMode ? "Cerrar" : "Cancelar"}
                </button>
                {!isViewMode && (
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-medium hover:from-cyan-700 hover:to-blue-700 transition-all disabled:opacity-50"
                  >
                    {saving ? "Guardando..." : "Guardar"}
                  </button>
                )}
              </div>
            </form>
          </Modal>

          {/* Modal de Pago (igual que services) */}
          <Modal
            isOpen={isPaymentModalOpen}
            onClose={closePaymentModal}
            title={payingOrder?.pagado ? "Actualizar Pago" : "Registrar Pago"}
          >
            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-xl mb-4">
                <p className="text-sm text-gray-600">Cliente: <span className="font-semibold text-gray-800">{payingOrder?.client?.nombre ?? "N/A"}</span></p>
                <p className="text-sm text-gray-600">Monto: <span className="font-semibold text-gray-800">${(payingOrder?.precio ?? 0)?.toLocaleString()}</span></p>
                {payingOrder?.pagado && (
                  <p className="text-sm text-green-600 mt-1">✓ Pago registrado - Puede modificar la forma de pago</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Forma de Pago</label>
                <select
                  value={paymentData.formaPago}
                  onChange={(e) => setPaymentData({ ...paymentData, formaPago: e.target.value as PaymentMethod, referencia: e.target.value === payingOrder?.formaPago ? (payingOrder?.referencia ?? "") : "" })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white"
                  required
                >
                  {getPaymentOptions().map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {(paymentData.formaPago === "TRANSFERENCIA" || paymentData.formaPago === "PAGO_ELECTRONICO") && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Número de Referencia</label>
                  <input
                    type="text"
                    value={paymentData.referencia}
                    onChange={(e) => setPaymentData({ ...paymentData, referencia: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    placeholder="Número de transacción ..."
                    required
                  />
                </div>
              )}

              {paymentData.formaPago === "FACTURACION" && (
                <div className="p-3 bg-amber-50 text-amber-700 rounded-xl text-sm">
                  <p>Al seleccionar Facturación, cuando la orden sea completada, pasará a estado &quot;Facturación Pendiente&quot;.</p>
                </div>
              )}

              {paymentError && (
                <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm">{paymentError}</div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closePaymentModal}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPayment}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50"
                >
                  {savingPayment ? "Procesando..." : (payingOrder?.pagado ? "Actualizar Pago" : "Confirmar Pago")}
                </button>
              </div>
            </form>
          </Modal>
        </div>
      </DashboardLayout>
    );
  }

  // VISTA ADMIN (dashboard normal)
  return (
    <DashboardLayout>
        <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-600 mt-1">Resumen general de operaciones</p>
        </div>




        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats?.map((stat, index) => {
            const Icon = stat?.icon;
            return (
              <motion.div
                key={stat?.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className={`p-3 rounded-xl ${stat?.bgColor}`}>
                    {Icon && <Icon className={`w-6 h-6 ${stat?.iconColor}`} />}
                  </div>
                  <ArrowUpRight className="w-5 h-5 text-gray-400" />
                </div>
                <div className="mt-4">
                  <h3 className="text-sm text-gray-500 font-medium">{stat?.name}</h3>
                  <p className="text-2xl font-bold text-gray-800 mt-1">
                    <AnimatedCounter value={stat?.value ?? 0} prefix={stat?.prefix} suffix={stat?.suffix} />
                  </p>
                  {stat?.name === "Total Camiones" && (
                    <div className="mt-3 space-y-1 text-sm">
                      <div className="flex items-center justify-between text-green-700">
                        <span>Disponibles</span>
                        <span className="font-semibold">
                          {data?.trucksByStatus?.disponible ?? 0}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-blue-700">
                        <span>En Servicio</span>
                        <span className="font-semibold">
                          {data?.trucksByStatus?.enServicio ?? 0}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-amber-700">
                        <span>Mantención</span>
                        <span className="font-semibold">
                          {data?.trucksByStatus?.mantenimiento ?? 0}
                        </span>
                      </div>
                    </div>
                  )}
                  {stat?.name === "Monto servicios" && (
                    <div className="mt-3 space-y-1 text-sm">
                      <div className="flex items-center justify-between text-gray-700">
                        <span>Periodo</span>
                        <span className="font-semibold text-xs">
                          {dateRangeString}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-amber-700">
                        <span>Por pagar</span>
                        <span className="font-semibold">
                          ${(unpaidCommission.toLocaleString())}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-cyan-600" />
                Órdenes de servicio
              </h2>
              {isAdministrativo && (
                <button
                  onClick={() => openModal(undefined, false)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl text-sm font-semibold hover:from-cyan-700 hover:to-blue-700 transition-all shadow-md hover:shadow-lg"
                >
                  <Plus className="w-4 h-4" />
                  Nueva orden de servicio
                </button>
              )}
            </div>
            <div className="space-y-4">
              {(data?.recentOrders?.length ?? 0) === 0 ? (
                <p className="text-gray-500 text-center py-8">No hay servicios recientes</p>
              ) : (
                data?.recentOrders?.map((order) => (
                  <div key={order?.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800">{order?.clientName}</p>
                      <div className="flex flex-col text-sm text-gray-500">
                        <p>Camión: {order?.truckPlaca}</p>
                        {(order as any).clientObservaciones && (
                          <div className="flex items-start gap-1 mt-1">
                            <FileText className="w-3 h-3 mt-1 flex-shrink-0" />
                            <span className="italic text-xs line-clamp-1">"{(order as any).clientObservaciones}"</span>
                          </div>
                        )}
                        {(order as any).observaciones && (
                          <div className="flex items-start gap-1 mt-0.5">
                            <ClipboardList className="w-3 h-3 mt-1 flex-shrink-0" />
                            <span className="italic text-xs line-clamp-1">Servicio: "{(order as any).observaciones}"</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:justify-end sm:gap-3">
                      <div className="text-left sm:text-right">
                        <p className={`font-semibold ${(order as any)?.comisionPagada ? "text-emerald-600" : "text-red-600"}`}>
                          ${(order?.precio ?? 0)?.toLocaleString()}
                        </p>
                        <p className={`text-xs ${(order as any)?.comisionPagada ? "text-emerald-500" : "text-red-600"}`}>
                          Comisión: ${(((order as any)?.comision ?? (order?.precio ?? 0) * 0.01) || 0).toLocaleString()}
                        </p>
                        <p className={`text-xs ${(order as any)?.comisionPagada ? "text-emerald-500" : "text-red-600"}`}>
                          {formatDate(order?.fechaProgramada)}
                        </p>
                      </div>
                      <button
                        onClick={() => handleViewRecentOrder(order?.id)}
                        className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2 whitespace-nowrap"
                      >
                        <Eye className="w-4 h-4" />
                        Ver
                      </button>
                      <StatusBadge status={order?.progreso ?? "PENDIENTE"} variant="progress" />
                      {!isOperador &&
                        (!(order as any)?.comisionPagada ? (
                          <button
                            onClick={() => setCommissionPaid(order.id, true)}
                            className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700"
                          >
                            Pagar comisión
                          </button>
                        ) : (
                          <button
                            onClick={() => setCommissionPaid(order.id, false)}
                            className="px-3 py-1 rounded-full text-xs font-medium bg-red-600 text-white hover:bg-red-700"
                          >
                            Reversar comisión
                          </button>
                        ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>

        </div>

        
      </div>
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={isViewMode ? "Ver Orden" : (editingOrder ? "Editar Orden" : "Nueva Orden de Servicio")}
      >
        <form onSubmit={handleSubmit} className="space-y-4 pr-1 sm:pr-2">
          <div ref={clientDropdownRef} className="relative">
            {isViewMode &&
              (() => {
                const clientFromOrder = editingOrder?.client;
                const clientFromList = editingOrder?.clientId ? clients.find((c) => c.id === editingOrder.clientId) : undefined;
                const tipoCliente = clientFromOrder?.tipoCliente ?? clientFromList?.tipoCliente;
                const rut = clientFromOrder?.rut ?? clientFromList?.rut;
                const email = clientFromOrder?.email ?? clientFromList?.email;
                if ((tipoCliente !== "EMPRESA" || !rut) && !email) return null;
                return (
                  <>
                    {tipoCliente === "EMPRESA" && !!rut && (
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">RUT</label>
                        <input
                          type="text"
                          value={rut}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-100 cursor-not-allowed"
                          disabled
                        />
                      </div>
                    )}
                    {!!email && (
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                        <input
                          type="email"
                          value={email}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-100 cursor-not-allowed"
                          disabled
                        />
                      </div>
                    )}
                  </>
                );
              })()}
            <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
            <input
              type="text"
              value={clientSearch}
              onChange={(e) => {
                setClientSearch(e.target.value);
                setIsClientDropdownOpen(true);
                if (!e.target.value) {
                  handleClientChange("");
                }
              }}
              onFocus={() => !isViewMode && setIsClientDropdownOpen(true)}
              placeholder="Buscar cliente..."
              className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent ${isViewMode ? "bg-gray-100 cursor-not-allowed" : "bg-white"}`}
              disabled={isViewMode}
            />
            {!formData.clientId && !isViewMode && (
              <input type="hidden" name="clientId" value="" required />
            )}
            {isClientDropdownOpen && !isViewMode && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                {clients
                  ?.filter((c) => c?.nombre?.toLowerCase()?.includes(clientSearch?.toLowerCase() ?? ""))
                  ?.map((c) => (
                    <button
                      key={c?.id}
                      type="button"
                      onClick={() => {
                        handleClientChange(c?.id ?? "");
                        setClientSearch(c?.nombre ?? "");
                        setIsClientDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-3 text-left hover:bg-cyan-50 transition-colors ${formData.clientId === c?.id ? "bg-cyan-100 font-medium" : ""}`}
                    >
                      {c?.nombre}
                    </button>
                  ))}
                {clients?.filter((c) => c?.nombre?.toLowerCase()?.includes(clientSearch?.toLowerCase() ?? ""))?.length === 0 && (
                  <div className="px-4 py-3 text-gray-500 text-sm">No se encontraron clientes</div>
                )}
              </div>
            )}
          </div>

          {formData.clientId && formData.clienteObservaciones && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones del Cliente</label>
              <div className="relative">
                <FileText className="absolute left-4 top-3 w-5 h-5 text-gray-400" />
                <textarea
                  value={formData.clienteObservaciones}
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl bg-amber-50 text-gray-600 cursor-not-allowed resize-none"
                  rows={2}
                  disabled
                  readOnly
                />
              </div>
            </div>
          )}

          {formData.clientId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  className={`w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent ${isViewMode ? "bg-gray-100 cursor-not-allowed" : ""}`}
                  placeholder="+56 9 1234 5678"
                  disabled={isViewMode}
                />
              </div>
            </div>
          )}

          {formData.clientId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.direccion}
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-100 text-gray-600 cursor-not-allowed"
                  placeholder="Dirección completa"
                  disabled
                  readOnly
                />
              </div>
            </div>
          )}



          {formData.clientId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Fosa</label>
              <select
                value={formData.tipoFosa}
                onChange={(e) => setFormData({ ...formData, tipoFosa: e.target.value as any })}
                className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent ${isViewMode ? "bg-gray-100 cursor-not-allowed" : "bg-white"}`}
                disabled={isViewMode}
              >
                <option value="">Seleccionar tipo</option>
                {Object.entries(tipoFosaLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Camión</label>
            <select
              value={formData.truckId}
              onChange={(e) => setFormData({ ...formData, truckId: e.target.value })}
              className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent ${isViewMode ? "bg-gray-100 cursor-not-allowed" : "bg-white"}`}
              required
              disabled={isViewMode}
            >
              <option value="">Seleccionar camión</option>
              {trucks?.filter((t) => t?.estado === "DISPONIBLE" || t?.id === formData.truckId)?.map((t) => (
                <option key={t?.id} value={t?.id}>
                  {t?.placa} - {(t?.capacidad ?? 0)?.toLocaleString()}L
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Volumen (L)</label>
              <input
                type="number"
                value={formData.volumen}
                onChange={(e) => setFormData({ ...formData, volumen: e.target.value })}
                className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent ${isViewMode ? "bg-gray-100 cursor-not-allowed" : ""}`}
                placeholder="4000"
                required
                disabled={isViewMode}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio ($)</label>
              <input
                type="number"
                value={formData.precio}
                onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
                className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent ${isViewMode ? "bg-gray-100 cursor-not-allowed" : ""}`}
                placeholder="150000"
                required
                disabled={isViewMode}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones de la Orden</label>
            <textarea
              value={formData.observaciones}
              onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
              className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none ${isViewMode ? "bg-gray-100 cursor-not-allowed" : ""}`}
              placeholder="Notas adicionales sobre esta orden de servicio..."
              rows={2}
              disabled={isViewMode}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <input
              type="text"
              value={progresoLabels?.[formData.progreso as string] ?? formData.progreso}
              disabled
              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-100 text-gray-600 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Programada</label>
            <input
              type="date"
              value={formData.fechaProgramada}
              onChange={(e) => setFormData({ ...formData, fechaProgramada: e.target.value })}
              className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent ${isViewMode ? "bg-gray-100 cursor-not-allowed" : ""}`}
              required
              disabled={isViewMode}
            />
          </div>
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>
          )}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={closeModal}
              className={`${isViewMode ? "w-full" : "flex-1"} px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors`}
            >
              {isViewMode ? "Cerrar" : "Cancelar"}
            </button>
            {!isViewMode && (
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-medium hover:from-cyan-700 hover:to-blue-700 transition-all disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
            )}
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
