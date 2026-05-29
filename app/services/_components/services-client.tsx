"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { motion } from "framer-motion";
import {
  ClipboardList,
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  Truck,
  Users,
  Calendar as CalendarIcon,
  DollarSign,
  Droplets,
  Phone,
  MapPin,
  CreditCard,
  FileText,
  Eye,
  Loader2,
} from "lucide-react";
import type { ServiceOrder, Truck as TruckType, Client, FosaType, PaymentMethod } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { es as localeEs } from "date-fns/locale";

// Opciones de progreso para operadores (estados básicos)
const progresoOptionsOperador = [
  { value: "PENDIENTE", label: "Pendiente" },
  { value: "EN_CAMINO", label: "En Camino" },
  { value: "OPERANDO", label: "Operando" },
  { value: "COMPLETADO", label: "Completada" },
];

// Opciones de progreso para admin (incluye estados adicionales)
const progresoOptionsAdmin = [
  { value: "PENDIENTE", label: "Pendiente" },
  { value: "EN_CAMINO", label: "En Camino" },
  { value: "OPERANDO", label: "Operando" },
  { value: "COMPLETADO", label: "Completada" },
  { value: "FACTURACION_PENDIENTE", label: "Facturación Pendiente" },
  { value: "FACTURACION_TERMINADA", label: "En proceso de facturación" },
  { value: "TERMINADA_CONTABILIZADA", label: "Facturada y enviada" },
  { value: "PAGO_REALIZADO_Y_CONTABILIZADO", label: "Pago realizado y contabilizado" },
];

// Opciones de progreso para admin (Persona Natural - versión reducida)
const progresoOptionsAdminNatural = [
  { value: "PENDIENTE", label: "Pendiente" },
  { value: "EN_CAMINO", label: "En Camino" },
  { value: "OPERANDO", label: "Operando" },
  { value: "COMPLETADO", label: "Completada" },
  { value: "PAGO_REALIZADO_Y_CONTABILIZADO", label: "Pago realizado y contabilizado" },
];

// Estados que solo el admin puede editar
const estadosSoloAdmin = ["COMPLETADO", "FACTURACION_PENDIENTE", "FACTURACION_TERMINADA", "TERMINADA_CONTABILIZADA", "PAGO_REALIZADO_Y_CONTABILIZADO"];

const formaPagoOptions = [
  { value: "EFECTIVO", label: "Efectivo" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
  { value: "PAGO_ELECTRONICO", label: "Pago electrónico" },
];

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

// Componente de mapa dinámico para evitar SSR
function MapComponent({ 
  lat, 
  lng, 
  onLocationChange 
}: { 
  lat: number; 
  lng: number; 
  onLocationChange: (lat: number, lng: number) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [L, setL] = useState<typeof import("leaflet") | null>(null);

  useEffect(() => {
    import("leaflet").then((leaflet) => {
      setL(leaflet.default);
    });
  }, []);

  useEffect(() => {
    if (!L || !mapRef.current) return;

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current).setView([lat || -33.45, lng || -70.65], 13);
      
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(mapInstanceRef.current);

      mapInstanceRef.current.on("click", (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        onLocationChange(lat, lng);
      });
    }

    const icon = L.icon({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
    });

    if (lat && lng) {
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng], { icon, draggable: false }).addTo(mapInstanceRef.current);
      }
      mapInstanceRef.current.setView([lat, lng], 15);
    }

    return () => {};
  }, [L, lat, lng, onLocationChange]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  return (
    <>
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        crossOrigin=""
      />
      <div ref={mapRef} className="h-[200px] w-full rounded-xl z-0" />
    </>
  );
}

export function ServicesClient() {
  const { data: session } = useSession() || {};
  const userRole = (session?.user as { role?: string })?.role;
  const isOperador = userRole === "OPERADOR" || userRole === "ADMINISTRATIVO";
  const isAdministrativo = userRole === "ADMINISTRATIVO";

  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [trucks, setTrucks] = useState<TruckType[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
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
  const isAdminEditing = isAdministrativo && !!editingOrder && !isViewMode;

  // States for tracking original client values
  const [originalClientVolumen, setOriginalClientVolumen] = useState<number | null>(null);
  const [originalClientPrecio, setOriginalClientPrecio] = useState<number | null>(null);

  // Estado para mostrar mapa
  const [showMap, setShowMap] = useState(false);
  const [filterJuridica, setFilterJuridica] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const clientDropdownRef = useRef<HTMLDivElement>(null);

  // Estados para modal de pago
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [payingOrder, setPayingOrder] = useState<ServiceOrder | null>(null);
  const [paymentData, setPaymentData] = useState({
    formaPago: "EFECTIVO" as PaymentMethod,
    referencia: "",
  });
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [uploadingFactura, setUploadingFactura] = useState(false);
  const [facturaError, setFacturaError] = useState("");
  const [showFacturaPreview, setShowFacturaPreview] = useState(false);

  const fetchData = async () => {
    try {
      const [ordersRes, trucksRes, clientsRes] = await Promise.all([
        fetch("/api/service-orders"),
        fetch("/api/trucks"),
        fetch("/api/clients"),
      ]);
      const [ordersData, trucksData, clientsData] = await Promise.all([
        ordersRes.json(),
        trucksRes.json(),
        clientsRes.json(),
      ]);
      
      if (Array.isArray(ordersData)) {
        setOrders(ordersData);
      } else {
        console.error("Invalid orders data:", ordersData);
        setOrders([]);
      }

      if (Array.isArray(trucksData)) {
        setTrucks(trucksData);
      } else {
        console.error("Invalid trucks data:", trucksData);
        setTrucks([]);
      }

      if (Array.isArray(clientsData)) {
        setClients(clientsData.sort((a: any, b: any) => a.nombre.localeCompare(b.nombre)));
      } else {
        console.error("Invalid clients data:", clientsData);
        setClients([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const uploadFacturaPdf = async (orderId: string, file: File) => {
    setFacturaError("");
    setUploadingFactura(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/service-orders/${orderId}/invoice`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setFacturaError(data?.error || "Error al subir factura");
        return false;
      }
      await fetchData();
      setShowFacturaPreview(true);
      window.dispatchEvent(new CustomEvent("aquaflow-data-updated"));
      return true;
    } catch {
      setFacturaError("Error al subir factura");
      return false;
    } finally {
      setUploadingFactura(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Escuchar eventos de actualización
    const handleDataUpdate = () => {
      fetchData();
    };
    window.addEventListener("aquaflow-data-updated", handleDataUpdate);
    
    // Refrescar cuando la página vuelve a ser visible
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchData();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleDataUpdate);

    // Polling cada 15 segundos para sincronización entre dispositivos
    const pollInterval = setInterval(() => {
      fetchData();
    }, 15000);

    return () => {
      window.removeEventListener("aquaflow-data-updated", handleDataUpdate);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleDataUpdate);
      clearInterval(pollInterval);
    };
  }, []);

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

  // Filtrar órdenes: operadores solo ven ciertos estados
  const filteredOrders = orders?.filter((o) => {
    // Operadores solo ven: Pendiente, En Camino, Operando, Completada y Facturación Pendiente
    if (isOperador) {
      const allowedStatuses = ["PENDIENTE", "EN_CAMINO", "OPERANDO", "COMPLETADO", "FACTURACION_PENDIENTE"];
      if (!allowedStatuses.includes(o?.progreso ?? "")) {
        return false;
      }
    }
    // Filtro de búsqueda
    const matchesSearch = o?.client?.nombre?.toLowerCase()?.includes(searchTerm?.toLowerCase()) ||
      o?.truck?.placa?.toLowerCase()?.includes(searchTerm?.toLowerCase());
    
    // Filtro Persona Jurídica
    const matchesJuridica = filterJuridica ? o?.client?.tipoCliente === "EMPRESA" : true;

    return matchesSearch && matchesJuridica;
  }) ?? [];

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return "";
    try {
      // Manual parsing to avoid timezone issues: assume ISO string YYYY-MM-DD...
      const datePart = dateStr.split("T")[0];
      const [year, month, day] = datePart.split("-");
      return `${day}-${month}-${year}`;
    } catch {
      return "";
    }
  };

  const isoToDDMMYYYY = (iso: string | undefined) => {
    if (!iso) return "";
    try {
      const datePart = iso.includes("T") ? iso.split("T")[0] : iso;
      const [year, month, day] = datePart.split("-");
      if (!year || !month || !day) return "";
      return `${day.padStart(2, "0")}-${month.padStart(2, "0")}-${year}`;
    } catch {
      return "";
    }
  };

  const ddmmyyyyToISO = (val: string) => {
    if (!val) return "";
    const normalized = val.replace(/-/g, "/");
    const parts = normalized.split("/");
    if (parts.length !== 3) return "";
    const [dd, mm, yyyy] = parts;
    if (!dd || !mm || !yyyy) return "";
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  };

  const maskDDMMYYYY = (raw: string) => {
    // Keep only digits and insert slashes as DD/MM/YYYY
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    const dd = digits.slice(0, 2);
    const mm = digits.slice(2, 4);
    const yyyy = digits.slice(4, 8);
    if (digits.length <= 2) return dd;
    if (digits.length <= 4) return `${dd}-${mm}`;
    return `${dd}-${mm}-${yyyy}`;
  };

  const formatDateForInput = (dateStr: string | undefined) => isoToDDMMYYYY(dateStr || "");

  const ddmmyyyyToDate = (val: string) => {
    const normalized = val.replace(/-/g, "/");
    const parts = normalized.split("/");
    if (parts.length !== 3) return undefined;
    const [dd, mm, yyyy] = parts;
    const y = Number(yyyy);
    const m = Number(mm) - 1;
    const d = Number(dd);
    if (!y || isNaN(m) || !d) return undefined;
    const date = new Date(y, m, d);
    return isNaN(date.getTime()) ? undefined : date;
  };

  const dateToDDMMYYYY = (date: Date | undefined) => {
    if (!date) return "";
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = String(date.getFullYear());
    return `${dd}-${mm}-${yyyy}`;
  };

  const openModal = (order?: ServiceOrder, viewOnly = false) => {
    setIsViewMode(viewOnly);
    setClientSearch("");
    setIsClientDropdownOpen(false);
    if (order) {
      setEditingOrder(order);
      const client = clients.find(c => c.id === order.clientId);
      if (client) setClientSearch(client.nombre);
      
      // Si la orden ya está COMPLETADO, usar los datos congelados de la orden
      // Si no, leer los datos frescos del cliente
      const isCompleted = order?.progreso === "COMPLETADO" || order?.progreso === "FACTURACION_PENDIENTE";
      
      setFormData({
        truckId: order?.truckId ?? "",
        clientId: order?.clientId ?? "",
        volumen: String(order?.volumen ?? ""),
        precio: String(order?.precio ?? ""),
        progreso: order?.progreso ?? "PENDIENTE",
        fechaProgramada: formatDateForInput(order?.fechaProgramada),
        // Si está completada, usar datos de la orden; si no, datos frescos del cliente
        telefono: isCompleted ? (order?.telefono ?? "") : (client?.telefono ?? ""),
        direccion: isCompleted ? (order?.direccion ?? "") : (client?.direccion ?? ""),
        latitud: isCompleted ? (order?.latitud ?? 0) : (client?.latitud ?? 0),
        longitud: isCompleted ? (order?.longitud ?? 0) : (client?.longitud ?? 0),
        tipoFosa: isCompleted ? (order?.tipoFosa ?? "") : (client?.tipoFosa ?? ""),
        observaciones: order?.observaciones ?? "",
        clienteObservaciones: client?.observaciones ?? "",
      });
      setOriginalClientVolumen(client?.volumen ?? null);
      setOriginalClientPrecio(client?.precio ?? null);
      setShowMap(isCompleted ? (!!order?.latitud && order?.latitud !== 0) : (!!client?.latitud && client?.latitud !== 0));
    } else {
      setEditingOrder(null);
      setFormData({
        truckId: "",
        clientId: "",
        volumen: "",
        precio: "",
        progreso: "PENDIENTE",
        fechaProgramada: isoToDDMMYYYY(new Date().toISOString()),
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
      setShowMap(false);
    }
    setError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingOrder(null);
    setShowMap(false);
    setIsViewMode(false);
    setShowFacturaPreview(false);
    setFacturaError("");
  };

  // Handle client selection change
  const handleClientChange = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setFormData({
        ...formData,
        clientId,
        volumen: client.volumen ? String(client.volumen) : "",
        precio: client.precio ? String(client.precio) : "",
        telefono: client.telefono ?? "",
        direccion: client.direccion ?? "",
        latitud: client.latitud ?? 0,
        longitud: client.longitud ?? 0,
        tipoFosa: client.tipoFosa ?? "",
        clienteObservaciones: client.observaciones ?? "",
      });
      setOriginalClientVolumen(client.volumen ?? 0);
      setOriginalClientPrecio(client.precio ?? 0);
      setShowMap(!!client.latitud && client.latitud !== 0);
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
      setShowMap(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const url = editingOrder ? `/api/service-orders/${editingOrder.id}` : "/api/service-orders";
      const method = editingOrder ? "PUT" : "POST";

      // Check if volumen or precio changed from original client values
      const volumenChanged = originalClientVolumen !== null && Number(formData.volumen) !== originalClientVolumen;
      const precioChanged = originalClientPrecio !== null && Number(formData.precio) !== originalClientPrecio;
      const updateClientData = volumenChanged || precioChanged;

      const fechaISO = ddmmyyyyToISO(formData.fechaProgramada);
      const progresoToSend = !editingOrder && isAdministrativo ? "PENDIENTE" : formData.progreso;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          fechaProgramada: fechaISO,
          progreso: progresoToSend,
          updateClientData,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Error al guardar");
        return;
      }

      closeModal();
      fetchData();
      window.dispatchEvent(new CustomEvent("aquaflow-data-updated"));
    } catch (e) {
      setError("Error al guardar orden");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar esta orden?")) return;

    try {
      await fetch(`/api/service-orders/${id}`, { method: "DELETE" });
      fetchData();
      window.dispatchEvent(new CustomEvent("aquaflow-data-updated"));
    } catch (e) {
      console.error(e);
    }
  };

  // Funciones de pago
  const openPaymentModal = (order: ServiceOrder) => {
    setPayingOrder(order);
    // Cargar datos de pago existentes si hay
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

  // Verificar si el cliente es Persona Jurídica
  const isClientePersonaJuridica = (order: ServiceOrder | null) => {
    if (!order) return false;
    // Check if client data is populated in the order
    if (order.client && order.client.tipoCliente === "EMPRESA") return true;
    // Fallback to finding in the clients list
    const client = clients.find((c) => c.id === order.clientId);
    return client?.tipoCliente === "EMPRESA";
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingOrder) return;
    
    setPaymentError("");
    setSavingPayment(true);

    try {
      const res = await fetch(`/api/service-orders/${payingOrder.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentData),
      });

      const data = await res.json();
      if (!res.ok) {
        setPaymentError(data?.error ?? "Error al procesar pago");
        return;
      }

      closePaymentModal();
      fetchData();
      window.dispatchEvent(new CustomEvent("aquaflow-data-updated"));
    } catch (e) {
      setPaymentError("Error al procesar pago");
    } finally {
      setSavingPayment(false);
    }
  };

  // Obtener opciones de forma de pago según tipo de cliente
  const getPaymentOptions = () => {
    const options = [...formaPagoOptions];
    if (isClientePersonaJuridica(payingOrder)) {
      options.push({ value: "FACTURACION", label: "Facturación" });
    }
    return options;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Órdenes de servicio</h1>
            <p className="text-gray-600 mt-1">Gestión de órdenes de servicio</p>
          </div>
          <button
            onClick={() => openModal()}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-semibold hover:from-cyan-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl"
          >
            <Plus className="w-5 h-5" />
            {isAdministrativo ? "Nueva orden de servicio" : "Nueva Orden"}
          </button>
        </div>

        {/* Search */}
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por cliente o camión..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          <label className="flex items-center gap-2 cursor-pointer bg-white px-4 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
            <input
              type="checkbox"
              checked={filterJuridica}
              onChange={(e) => setFilterJuridica(e.target.checked)}
              className="w-5 h-5 text-cyan-600 rounded focus:ring-cyan-500 border-gray-300"
            />
            <span className="text-gray-700 font-medium">Persona Jurídica</span>
          </label>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <ClipboardList className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p>No hay órdenes de servicio</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredOrders?.map((order, i) => (
              <motion.div
                key={order?.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow p-6"
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
                    {order?.client?.tipoCliente === "EMPRESA" && (
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={() => window.open(`/api/service-orders/${order?.id}/invoice`, "_blank")}
                          className={`inline-flex items-center gap-2 px-2 py-1 rounded-lg text-xs font-medium ${
                            order?.facturaSubidaAt
                              ? "bg-cyan-600 text-white hover:bg-cyan-700"
                              : "bg-gray-100 text-gray-500 cursor-not-allowed"
                          }`}
                          disabled={!order?.facturaSubidaAt}
                        >
                          <FileText className="w-4 h-4" />
                          Factura
                        </button>
                      </div>
                    )}
                  </div>
                  <StatusBadge status={order?.progreso ?? "PENDIENTE"} variant="progress" />
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
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
                      <CalendarIcon className="w-4 h-4" />
                      Fecha
                    </div>
                    <p className="font-semibold">{formatDate(order?.fechaProgramada)}</p>
                  </div>
                </div>

                <ProgressBar 
                  progress={order?.progreso ?? "PENDIENTE"} 
                  isJuridica={order?.client?.tipoCliente === "EMPRESA"}
                />

                {/* Payment status indicator */}
                {order?.pagado && (
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    <CreditCard className="w-4 h-4 text-green-600" />
                    <span className="text-green-600 font-medium">
                      Pagado: {formaPagoLabels[order?.formaPago ?? ""] ?? order?.formaPago}
                      {order?.referencia && ` - Ref: ${order.referencia}`}
                    </span>
                  </div>
                )}

                <div className="flex gap-2 mt-4 pt-4 border-t">
                  {/* Logic for button visibility based on role and status */}
                  {(() => {
                    // Estados que solo admin puede editar
                    const esEstadoSoloAdmin = estadosSoloAdmin.includes(order?.progreso ?? "");
                    // Estados donde operador puede editar
                    const isActiveForOperador = ["PENDIENTE", "EN_CAMINO", "OPERANDO"].includes(order?.progreso ?? "");
                    // Operadores no pueden editar estados finales
                    const showPayEditForOperador = isOperador ? isActiveForOperador : true;
                    const showDeleteForOperador = isOperador ? order?.progreso === "PENDIENTE" : true;
                    // Estados donde se oculta el botón Pagar (estados finales)
                    const hidePagarButton = estadosSoloAdmin.includes(order?.progreso ?? "");
                    
                    // Para operadores: solo mostrar "Ver" cuando está en estado solo admin
                    if (esEstadoSoloAdmin && isOperador) {
                      return (
                        <button
                          onClick={() => openModal(order, true)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          Ver
                        </button>
                      );
                    }
                    
                    return (
                      <>
                        {/* Pagar button - hide when in estados solo admin OR if client is EMPRESA */}
                        {!hidePagarButton && showPayEditForOperador && !isClientePersonaJuridica(order) && (
                          <button
                            onClick={() => openPaymentModal(order)}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                          >
                            <CreditCard className="w-4 h-4" />
                            Pagar
                          </button>
                        )}
                        {showPayEditForOperador && (
                          <button
                            onClick={() => openModal(order)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                            Editar
                          </button>
                        )}
                        {showDeleteForOperador && (
                          <button
                            onClick={() => handleDelete(order?.id)}
                            className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    );
                  })()}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={closeModal}
          title={isViewMode ? "Ver Orden" : (editingOrder ? "Editar Orden" : "Nueva Orden de Servicio")}
        >
          <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            <div ref={clientDropdownRef} className="relative">
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
                onFocus={() => !isViewMode && !isAdminEditing && setIsClientDropdownOpen(true)}
                placeholder="Buscar cliente..."
                className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent ${
                  isViewMode || isAdminEditing ? "bg-gray-100 cursor-not-allowed" : "bg-white"
                }`}
                disabled={isViewMode || isAdminEditing}
              />
              {!formData.clientId && !isViewMode && !isAdminEditing && (
                <input type="hidden" name="clientId" value="" required />
              )}
              {isClientDropdownOpen && !isViewMode && !isAdminEditing && (
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

            {(() => {
              if (!formData.clientId) return null;
              const selectedClient = clients.find((c) => c.id === formData.clientId);
              if (!selectedClient) return null;
              const showRut = selectedClient?.tipoCliente === "EMPRESA" && !!selectedClient?.rut;
              const showEmail = !!selectedClient?.email;
              if (!showRut && !showEmail) return null;
              return (
                <>
                  {showRut && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">RUT</label>
                      <input
                        type="text"
                        value={selectedClient?.rut ?? ""}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-100 text-gray-600 cursor-not-allowed"
                        disabled
                        readOnly
                      />
                    </div>
                  )}
                  {showEmail && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                      <input
                        type="email"
                        value={selectedClient?.email ?? ""}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-100 text-gray-600 cursor-not-allowed"
                        disabled
                        readOnly
                      />
                    </div>
                  )}
                </>
              );
            })()}

            {(() => {
              if (!formData.clientId) return null;
              const selectedClient = clients.find((c) => c.id === formData.clientId);
              const isEmpresa = selectedClient?.tipoCliente === "EMPRESA";
              if (!isEmpresa) return null;
              if (!editingOrder?.id) return null;

              const hasFactura = !!editingOrder?.facturaSubidaAt;
              const facturaUrl = `/api/service-orders/${editingOrder.id}/invoice`;

              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-700">Factura (PDF)</h3>
                    <button
                      type="button"
                      onClick={() => setShowFacturaPreview((v) => !v)}
                      className={`text-sm ${hasFactura ? "text-cyan-700 hover:text-cyan-800" : "text-gray-400 cursor-not-allowed"}`}
                      disabled={!hasFactura}
                    >
                      {showFacturaPreview ? "Ocultar" : "Ver"}
                    </button>
                  </div>

                  {!isViewMode && (
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          await uploadFacturaPdf(editingOrder.id, file);
                          e.currentTarget.value = "";
                        }}
                        className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                        disabled={uploadingFactura}
                      />
                      {uploadingFactura && <Loader2 className="w-5 h-5 animate-spin text-gray-500" />}
                    </div>
                  )}

                  {facturaError && (
                    <p className="text-sm text-red-600">{facturaError}</p>
                  )}

                  {showFacturaPreview && hasFactura && (
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <iframe title="Factura" src={facturaUrl} className="w-full h-[60vh]" />
                    </div>
                  )}
                </div>
              );
            })()}

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

            {formData.clientId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  {isAdminEditing ? (
                    <input
                      type="tel"
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                      placeholder="+56 9 1234 5678"
                    />
                  ) : (
                    <input
                      type="tel"
                      value={formData.telefono}
                      className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-100 text-gray-600 cursor-not-allowed"
                      placeholder="+56 9 1234 5678"
                      disabled
                      readOnly
                    />
                  )}
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

            {/* Mapa (solo visualización) */}
            {formData.clientId && showMap && formData.latitud !== 0 && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Ubicación en el Mapa
                </label>
                <MapComponent
                  lat={formData.latitud}
                  lng={formData.longitud}
                  onLocationChange={() => {}}
                />
                <span className="text-xs text-gray-500">
                  Lat: {formData.latitud.toFixed(6)}, Lng: {formData.longitud.toFixed(6)}
                </span>
              </div>
            )}

            {formData.clientId && formData.tipoFosa && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Fosa</label>
                {isAdminEditing ? (
                  <select
                    value={formData.tipoFosa}
                    onChange={(e) => setFormData({ ...formData, tipoFosa: e.target.value as any })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white"
                  >
                    <option value="">Seleccionar tipo</option>
                    {Object.entries(tipoFosaLabels).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={tipoFosaLabels[formData.tipoFosa] || formData.tipoFosa}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-100 text-gray-600 cursor-not-allowed"
                    disabled
                    readOnly
                  />
                )}
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
              {isAdministrativo && editingOrder ? (
                <input
                  type="text"
                  value={
                    (() => {
                      const selectedClient = clients.find(c => c.id === formData.clientId);
                      const isNatural = selectedClient?.tipoCliente === "PERSONA_NATURAL";
                      const options = isOperador 
                        ? progresoOptionsOperador 
                        : (isNatural ? progresoOptionsAdminNatural : progresoOptionsAdmin);
                      return options.find((opt) => opt.value === formData.progreso)?.label || formData.progreso;
                    })()
                  }
                  disabled
                  readOnly
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-100 text-gray-600 cursor-not-allowed"
                />
              ) : (!editingOrder && isAdministrativo) ? (
                <input
                  type="text"
                  value="Pendiente"
                  disabled
                  readOnly
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-100 text-gray-600 cursor-not-allowed"
                />
              ) : (
                <select
                  value={formData.progreso}
                  onChange={(e) => {
                    const newStatus = e.target.value;
                    let newDate = formData.fechaProgramada;
                    if (newStatus === "EN_CAMINO") {
                      newDate = isoToDDMMYYYY(new Date().toISOString());
                    }
                    setFormData({ ...formData, progreso: newStatus, fechaProgramada: newDate });
                  }}
                  className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent ${isViewMode ? "bg-gray-100 cursor-not-allowed" : "bg-white"}`}
                  disabled={isViewMode}
                >
                  {(() => {
                    const selectedClient = clients.find(c => c.id === formData.clientId);
                    const isNatural = selectedClient?.tipoCliente === "PERSONA_NATURAL";
                    const options = isOperador 
                      ? progresoOptionsOperador 
                      : (isNatural ? progresoOptionsAdminNatural : progresoOptionsAdmin);
                    return options.map((opt) => (
                      <option key={opt?.value} value={opt?.value}>
                        {opt?.label}
                      </option>
                    ));
                  })()}
                </select>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Programada</label>
              {isAdministrativo && editingOrder ? (
                <input
                  type="text"
                  value={formData.fechaProgramada}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-100 text-gray-600 cursor-not-allowed"
                  disabled
                  readOnly
                />
              ) : (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={`w-full justify-start text-left font-normal ${isViewMode || ["EN_CAMINO", "OPERANDO", "COMPLETADO", "FACTURACION_PENDIENTE", "FACTURACION_TERMINADA", "TERMINADA_CONTABILIZADA"].includes(formData.progreso) ? "bg-gray-100 cursor-not-allowed" : ""}`}
                      disabled={isViewMode || ["EN_CAMINO", "OPERANDO", "COMPLETADO", "FACTURACION_PENDIENTE", "FACTURACION_TERMINADA", "TERMINADA_CONTABILIZADA"].includes(formData.progreso)}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.fechaProgramada ? formData.fechaProgramada : "Seleccionar fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2" align="start">
                    <CalendarUI
                      mode="single"
                      locale={localeEs}
                      formatters={{
                        formatWeekdayName: (date) => {
                          const map = ["do", "lu", "ma", "mi", "ju", "vi", "sá"];
                          return map[date.getDay()];
                        },
                        formatCaption: (month) =>
                          month.toLocaleDateString("es-ES", {
                            month: "long",
                            year: "numeric",
                          }),
                      }}
                      selected={ddmmyyyyToDate(formData.fechaProgramada)}
                      onSelect={(date) => {
                        const formatted = dateToDDMMYYYY(date as Date);
                        setFormData({ ...formData, fechaProgramada: formatted });
                      }}
                      initialFocus
                    />
                    <div className="flex items-center justify-between mt-2 px-1">
                      <button
                        type="button"
                        className="text-sm text-blue-600 hover:underline"
                        onClick={() => setFormData({ ...formData, fechaProgramada: "" })}
                      >
                        Borrar
                      </button>
                      <button
                        type="button"
                        className="text-sm text-blue-600 hover:underline"
                        onClick={() => setFormData({ ...formData, fechaProgramada: dateToDDMMYYYY(new Date()) })}
                      >
                        Hoy
                      </button>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
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

        {/* Payment Modal */}
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

            {/* Reference number field - show only for Transferencia or Pago electrónico */}
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
                className="flex-1 px-4 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-medium hover:from-cyan-700 hover:to-blue-700 transition-all disabled:opacity-50"
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
