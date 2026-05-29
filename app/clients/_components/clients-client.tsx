"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { DashboardLayout } from "../../../components/dashboard-layout";
import { Modal } from "../../../components/ui/modal";
import { motion } from "framer-motion";
import { Users, Plus, Pencil, Trash2, Search, X, Phone, Mail, MapPin, Loader2, CheckCircle2, FileText, Eye, ClipboardList } from "lucide-react";
import type { Client, ServiceOrder } from "@/lib/types";
import { normalizeClientName } from "@/lib/utils";

const tipoFosaOptions = [
  { value: "SEPTICA", label: "Séptica" },
  { value: "AGUAS_GRISES", label: "Aguas Grises" },
  { value: "INDUSTRIAL", label: "Industrial" },
];

const tipoClienteOptions = [
  { value: "PERSONA_NATURAL", label: "Persona Natural" },
  { value: "EMPRESA", label: "Persona Jurídica" },
];

const tipoFosaLabels: Record<string, string> = {
  SEPTICA: "Séptica",
  AGUAS_GRISES: "Aguas Grises",
  INDUSTRIAL: "Industrial",
};

const tipoFosaColors: Record<string, string> = {
  SEPTICA: "bg-green-100 text-green-700",
  AGUAS_GRISES: "bg-blue-100 text-blue-700",
  INDUSTRIAL: "bg-purple-100 text-purple-700",
};

interface GeoResult {
  lat: string;
  lon: string;
  display_name: string;
}

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

    // Crear mapa si no existe
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current).setView([lat || -33.45, lng || -70.65], 13);
      
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(mapInstanceRef.current);

      // Click en mapa para mover marcador
      mapInstanceRef.current.on("click", (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        onLocationChange(lat, lng);
      });
    }

    // Actualizar o crear marcador
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
        markerRef.current = L.marker([lat, lng], { icon, draggable: true }).addTo(mapInstanceRef.current);
        markerRef.current.on("dragend", () => {
          const pos = markerRef.current?.getLatLng();
          if (pos) onLocationChange(pos.lat, pos.lng);
        });
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
      <div ref={mapRef} className="h-[250px] w-full rounded-xl z-0" />
    </>
  );
}

export function ClientsClient() {
  const { data: session } = useSession() || {};
  const userRole = (session?.user as { role?: string })?.role;
  const isOperador = userRole === "OPERADOR";

  const [clients, setClients] = useState<Client[]>([]);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [formData, setFormData] = useState({
    nombre: "",
    telefono: "",
    email: "",
    direccion: "",
    tipoFosa: "SEPTICA",
    tipoCliente: "PERSONA_NATURAL",
    rut: "",
    observaciones: "",
    latitud: 0,
    longitud: 0,
    volumen: 0,
    precio: 0,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  
  // Estados para búsqueda de dirección
  const [addressSearch, setAddressSearch] = useState("");
  const [searchResults, setSearchResults] = useState<GeoResult[]>([]);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [filterJuridica, setFilterJuridica] = useState(false);
  const [viewingServicesClient, setViewingServicesClient] = useState<Client | null>(null);
  const [isServicesModalOpen, setIsServicesModalOpen] = useState(false);

  const fetchClients = async () => {
    try {
      const [clientsRes, ordersRes] = await Promise.all([
        fetch("/api/clients"),
        fetch("/api/service-orders"),
      ]);
      const [clientsData, ordersData] = await Promise.all([
        clientsRes.json(),
        ordersRes.json(),
      ]);
      if (Array.isArray(clientsData)) {
        setClients(clientsData);
      } else {
        console.error("Invalid clients data:", clientsData);
        setClients([]);
      }

      if (Array.isArray(ordersData)) {
        setServiceOrders(ordersData);
      } else {
        console.error("Invalid orders data:", ordersData);
        setServiceOrders([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  // Check if a client has any completed order
  const completedStates = ["COMPLETADO", "FACTURACION_PENDIENTE", "FACTURACION_TERMINADA", "TERMINADA_CONTABILIZADA", "PAGO_REALIZADO_Y_CONTABILIZADO"];
  const clientHasCompletedOrder = (clientId: string) => {
    return serviceOrders.some(
      (order) =>
        order.clientId === clientId &&
        completedStates.includes(order.progreso)
    );
  };

  // For operators: can now edit all clients (requested behavior change)
  const canOperadorEditClient = (clientId: string) => {
    return true;
  };

  const filteredClients = clients?.filter(
    (c) => {
      const matchesSearch = c?.nombre?.toLowerCase()?.includes(searchTerm?.toLowerCase()) ||
        c?.direccion?.toLowerCase()?.includes(searchTerm?.toLowerCase()) ||
        c?.email?.toLowerCase()?.includes(searchTerm?.toLowerCase());
      const matchesJuridica = filterJuridica ? c?.tipoCliente === "EMPRESA" : true;
      return matchesSearch && matchesJuridica;
    }
  ) ?? [];

  const openModal = (client?: Client, viewOnly = false) => {
    setIsViewMode(viewOnly);
    if (client) {
      setEditingClient(client);
      setFormData({
        nombre: client?.nombre ?? "",
        telefono: client?.telefono ?? "",
        email: client?.email ?? "",
        direccion: client?.direccion ?? "",
        tipoFosa: client?.tipoFosa ?? "SEPTICA",
        tipoCliente: client?.tipoCliente ?? "PERSONA_NATURAL",
        rut: formatRut(client?.rut ?? ""),
        observaciones: client?.observaciones ?? "",
        latitud: client?.latitud ?? 0,
        longitud: client?.longitud ?? 0,
        volumen: client?.volumen ?? 0,
        precio: client?.precio ?? 0,
      });
      setAddressSearch(client?.direccion ?? "");
      setLocationConfirmed(!!client?.latitud && !!client?.longitud && client.latitud !== 0);
      setShowMap(!!client?.latitud && client.latitud !== 0);
    } else {
      setEditingClient(null);
      setFormData({ nombre: "", telefono: "", email: "", direccion: "", tipoFosa: "SEPTICA", tipoCliente: "PERSONA_NATURAL", rut: "", observaciones: "", latitud: 0, longitud: 0, volumen: 0, precio: 0 });
      setAddressSearch("");
      setLocationConfirmed(false);
      setShowMap(false);
    }
    setSearchResults([]);
    setError("");
    setIsModalOpen(true);
  };

  const openServicesModal = (client: Client) => {
    setViewingServicesClient(client);
    setIsServicesModalOpen(true);
  };

  const closeServicesModal = () => {
    setViewingServicesClient(null);
    setIsServicesModalOpen(false);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingClient(null);
    setShowMap(false);
    setIsViewMode(false);
  };

  // Buscar dirección usando Nominatim (OpenStreetMap)
  const searchAddress = async () => {
    if (!addressSearch.trim()) return;
    setSearchingAddress(true);
    setSearchResults([]);
    
    try {
      const query = encodeURIComponent(addressSearch + ", Chile");
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=5&addressdetails=1`,
        { headers: { "Accept-Language": "es" } }
      );
      const data: GeoResult[] = await res.json();
      setSearchResults(data);
    } catch (e) {
      console.error("Error buscando dirección:", e);
    } finally {
      setSearchingAddress(false);
    }
  };

  // Seleccionar resultado de búsqueda
  const selectAddress = (result: GeoResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setFormData({
      ...formData,
      direccion: result.display_name,
      latitud: lat,
      longitud: lng,
    });
    setAddressSearch(result.display_name);
    setSearchResults([]);
    setShowMap(true);
    setLocationConfirmed(false);
  };

  // Callback para cuando se mueve el marcador en el mapa
  const handleLocationChange = useCallback((lat: number, lng: number) => {
    setFormData(prev => ({
      ...prev,
      latitud: lat,
      longitud: lng,
    }));
    setLocationConfirmed(false);
  }, []);

  const confirmLocation = () => {
    setLocationConfirmed(true);
  };

  const formatRut = (rut: string) => {
    if (!rut) return "";
    const cleanRut = rut.replace(/[^0-9kK]/g, "");
    if (cleanRut.length <= 1) return cleanRut;
    
    const body = cleanRut.slice(0, -1);
    const dv = cleanRut.slice(-1).toUpperCase();
    
    // Format body with dots
    const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    
    return `${formattedBody}-${dv}`;
  };

  const handleRutBlur = () => {
    if (formData.rut) {
      setFormData(prev => ({ ...prev, rut: formatRut(prev.rut) }));
    }
  };

  const validateRut = (rut: string) => {
    if (!rut) return false;
    const cleanRut = rut.replace(/[^0-9kK]/g, "");
    if (cleanRut.length < 2) return false;
    
    const body = cleanRut.slice(0, -1);
    const dv = cleanRut.slice(-1).toUpperCase();
    
    let sum = 0;
    let multiplier = 2;
    
    for (let i = body.length - 1; i >= 0; i--) {
      sum += parseInt(body[i]) * multiplier;
      multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }
    
    const expectedDv = 11 - (sum % 11);
    let calculatedDv = "";
    
    if (expectedDv === 11) calculatedDv = "0";
    else if (expectedDv === 10) calculatedDv = "K";
    else calculatedDv = expectedDv.toString();
    
    return dv === calculatedDv;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (formData.tipoCliente === "EMPRESA") {
      if (!formData.rut) {
        setError("El RUT es requerido para empresas");
        return;
      }
      if (!validateRut(formData.rut)) {
        setError("El RUT ingresado no es válido");
        return;
      }
    }

    setSaving(true);

    try {
      const url = editingClient ? `/api/clients/${editingClient.id}` : "/api/clients";
      const method = editingClient ? "PUT" : "POST";
      const normalizedName = normalizeClientName(formData.nombre);
      if (normalizedName !== formData.nombre) {
        setFormData((prev) => ({ ...prev, nombre: normalizedName }));
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, nombre: normalizedName }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Error al guardar");
        return;
      }

      closeModal();
      fetchClients();
      window.dispatchEvent(new CustomEvent("aquaflow-data-updated"));
    } catch (e) {
      setError("Error al guardar cliente");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este cliente?")) return;

    try {
      await fetch(`/api/clients/${id}`, { method: "DELETE" });
      fetchClients();
      window.dispatchEvent(new CustomEvent("aquaflow-data-updated"));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Clientes</h1>
            <p className="text-gray-600 mt-1">Gestión de clientes y direcciones</p>
          </div>
          {!isOperador && (
            <button
              onClick={() => openModal()}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-semibold hover:from-cyan-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl"
            >
              <Plus className="w-5 h-5" />
              Nuevo Cliente
            </button>
          )}
        </div>

          {/* Search */}
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o dirección..."
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
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p>No hay clientes registrados</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredClients?.map((client, i) => (
              <motion.div
                key={client?.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-50 rounded-xl">
                      <Users className="w-6 h-6 text-blue-600" />
                    </div>
                    <h3 className="font-bold text-lg text-gray-800">{client?.nombre}</h3>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${tipoFosaColors?.[client?.tipoFosa] ?? "bg-gray-100"}`}
                  >
                    {tipoFosaLabels?.[client?.tipoFosa] ?? client?.tipoFosa}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    {client?.telefono}
                  </div>
                  {client?.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      {client?.email}
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                    <span className="line-clamp-2">{client?.direccion}</span>
                  </div>
                  {client?.observaciones && (
                    <div className="flex items-start gap-2">
                      <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                      <span className="line-clamp-2 text-gray-500 italic">{client?.observaciones}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-4 pt-4 border-t flex-wrap">
                  {(() => {
                    const canEdit = canOperadorEditClient(client?.id);
                    const canDelete = !isOperador; // Operators can never delete
                    
                    return (
                      <>
                        <button
                          onClick={() => openServicesModal(client)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-cyan-50 text-cyan-700 rounded-lg hover:bg-cyan-100 transition-colors"
                        >
                          <ClipboardList className="w-4 h-4" />
                          Ver servicios
                        </button>
                        {canEdit ? (
                          <button
                            onClick={() => openModal(client)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                            Editar
                          </button>
                        ) : (
                          <button
                            onClick={() => openModal(client, true)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                            Ver
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(client?.id)}
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
          title={isViewMode ? "Ver Cliente" : (editingClient ? "Editar Cliente" : "Nuevo Cliente")}
        >
          <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Cliente</label>
              <select
                value={formData.tipoCliente}
                onChange={(e) => setFormData({ ...formData, tipoCliente: e.target.value, rut: e.target.value === "PERSONA_NATURAL" ? "" : formData.rut })}
                className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent ${isViewMode ? "bg-gray-100 cursor-not-allowed" : "bg-white"}`}
                disabled={isViewMode}
              >
                {tipoClienteOptions?.map((opt) => (
                  <option key={opt?.value} value={opt?.value}>
                    {opt?.label}
                  </option>
                ))}
              </select>
            </div>
            {formData.tipoCliente === "EMPRESA" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">RUT</label>
                <input
                  type="text"
                  value={formData.rut}
                  onChange={(e) => setFormData({ ...formData, rut: e.target.value })}
                  className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent ${isViewMode ? "bg-gray-100 cursor-not-allowed" : ""}`}
                  onBlur={handleRutBlur} placeholder="Ej: 76.123.456-K"
                  disabled={isViewMode}
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                onBlur={() => {
                  if (isViewMode) return;
                  setFormData((prev) => ({ ...prev, nombre: normalizeClientName(prev.nombre) }));
                }}
                className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent ${isViewMode ? "bg-gray-100 cursor-not-allowed" : ""}`}
                placeholder="Nombre del cliente"
                required
                disabled={isViewMode}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input
                type="tel"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent ${isViewMode ? "bg-gray-100 cursor-not-allowed" : ""}`}
                placeholder="+56 9 1234 5678"
                required
                disabled={isViewMode}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent ${isViewMode ? "bg-gray-100 cursor-not-allowed" : ""}`}
                placeholder="cliente@dominio.com"
                disabled={isViewMode}
              />
            </div>
            
            {/* Búsqueda de dirección - hidden in view mode */}
            {!isViewMode && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Buscar Dirección</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={addressSearch}
                    onChange={(e) => setAddressSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), searchAddress())}
                    className="flex-1 min-w-0 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    placeholder="Ingrese dirección para buscar..."
                  />
                  <button
                    type="button"
                    onClick={searchAddress}
                    disabled={searchingAddress}
                    className="flex-shrink-0 px-4 py-3 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 transition-colors disabled:opacity-50 flex items-center justify-center min-w-[52px]"
                  >
                    {searchingAddress ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                  </button>
                </div>
                
                {/* Resultados de búsqueda */}
                {searchResults.length > 0 && (
                  <div className="mt-2 border border-gray-200 rounded-xl overflow-hidden">
                    {searchResults.map((result, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => selectAddress(result)}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-b-0 text-sm"
                      >
                        <MapPin className="w-4 h-4 inline mr-2 text-gray-400" />
                        {result.display_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Dirección seleccionada */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
              <input
                type="text"
                value={formData.direccion}
                onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent ${isViewMode ? "bg-gray-100 cursor-not-allowed" : ""}`}
                placeholder="Dirección completa"
                required
                disabled={isViewMode}
              />
            </div>

            {/* Mapa */}
            {showMap && formData.latitud !== 0 && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Ubicación en el Mapa
                  {!isViewMode && <span className="text-gray-400 font-normal ml-2">(Haz clic o arrastra el marcador para ajustar)</span>}
                </label>
                <MapComponent
                  lat={formData.latitud}
                  lng={formData.longitud}
                  onLocationChange={isViewMode ? () => {} : handleLocationChange}
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    Lat: {formData.latitud.toFixed(6)}, Lng: {formData.longitud.toFixed(6)}
                  </span>
                  {!isViewMode && (
                    <button
                      type="button"
                      onClick={confirmLocation}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        locationConfirmed 
                          ? "bg-green-100 text-green-700" 
                          : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {locationConfirmed ? "Ubicación Confirmada" : "Confirmar Ubicación"}
                    </button>
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Fosa</label>
              <select
                value={formData.tipoFosa}
                onChange={(e) => setFormData({ ...formData, tipoFosa: e.target.value })}
                className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent ${isViewMode ? "bg-gray-100 cursor-not-allowed" : "bg-white"}`}
                disabled={isViewMode}
              >
                {tipoFosaOptions?.map((opt) => (
                  <option key={opt?.value} value={opt?.value}>
                    {opt?.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Volumen y Precio */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Volumen (L)</label>
                <input
                  type="number"
                  value={formData.volumen || ""}
                  onChange={(e) => setFormData({ ...formData, volumen: Number(e.target.value) || 0 })}
                  className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent ${isViewMode ? "bg-gray-100 cursor-not-allowed" : ""}`}
                  placeholder="4000"
                  min="0"
                  disabled={isViewMode}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio ($)</label>
                <input
                  type="number"
                  value={formData.precio || ""}
                  onChange={(e) => setFormData({ ...formData, precio: Number(e.target.value) || 0 })}
                  className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent ${isViewMode ? "bg-gray-100 cursor-not-allowed" : ""}`}
                  placeholder="50000"
                  min="0"
                  disabled={isViewMode}
                />
              </div>
            </div>

            {/* Observaciones */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
              <textarea
                value={formData.observaciones}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none ${isViewMode ? "bg-gray-100 cursor-not-allowed" : ""}`}
                placeholder="Notas adicionales sobre el cliente, acceso, horarios, etc."
                rows={3}
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

        {/* Modal Servicios del Cliente */}
        <Modal
          isOpen={isServicesModalOpen}
          onClose={closeServicesModal}
          title={`Servicios - ${viewingServicesClient?.nombre ?? ""}`}
        >
          <div className="max-h-[70vh] overflow-y-auto pr-2">
            {(() => {
              const clientServices = serviceOrders.filter(o => o.clientId === viewingServicesClient?.id);
              if (clientServices.length === 0) {
                return (
                  <div className="text-center py-8 text-gray-500">
                    <ClipboardList className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No hay servicios registrados para este cliente.</p>
                  </div>
                );
              }
              return (
                <div className="space-y-4">
                  {clientServices.map((order) => (
                    <div key={order.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-gray-800">
                            {new Date(order.fechaProgramada).toLocaleDateString("es-CL")}
                          </p>
                          <p className="text-sm text-gray-500">Camión: {order.truck?.placa ?? "N/A"}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          order.progreso === "COMPLETADO" ? "bg-green-100 text-green-700" :
                          order.progreso === "PENDIENTE" ? "bg-amber-100 text-amber-700" :
                          "bg-blue-100 text-blue-700"
                        }`}>
                          {order.progreso.replace("_", " ")}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                        <div>Volumen: {order.volumen} L</div>
                        <div>Precio: ${order.precio.toLocaleString()}</div>
                      </div>
                      {order.observaciones && (
                        <p className="text-sm text-gray-500 mt-2 italic">"{order.observaciones}"</p>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}
            <div className="mt-6 pt-4 border-t">
              <button
                onClick={closeServicesModal}
                className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
