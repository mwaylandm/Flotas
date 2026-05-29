"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { CapacityIndicator } from "@/components/ui/capacity-indicator";
import { motion } from "framer-motion";
import { Truck as TruckIcon, Plus, Pencil, Trash2, Search, X } from "lucide-react";
import type { Truck } from "@/lib/types";

const estadoOptions = [
  { value: "DISPONIBLE", label: "Disponible" },
  { value: "MANTENIMIENTO", label: "Mantenimiento" },
];

export function TrucksClient() {
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTruck, setEditingTruck] = useState<Truck | null>(null);
  const [formData, setFormData] = useState({
    placa: "",
    capacidad: "",
    cargaActual: "",
    estado: "DISPONIBLE",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const fetchLogs = async (truckId: string) => {
    setLoadingLogs(true);
    try {
      const res = await fetch(`/api/trucks/${truckId}/logs`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (e) {
      console.error("Error fetching logs:", e);
    } finally {
      setLoadingLogs(false);
    }
  };

  const fetchTrucks = async () => {
    try {
      const res = await fetch("/api/trucks");
      const data = await res.json();
      setTrucks(data ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLogs(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrucks();
  }, []);

  const filteredTrucks = trucks?.filter(
    (t) =>
      t?.placa?.toLowerCase()?.includes(searchTerm?.toLowerCase()) ||
      t?.estado?.toLowerCase()?.includes(searchTerm?.toLowerCase())
  ) ?? [];

  const openModal = (truck?: Truck) => {
    if (truck) {
      setEditingTruck(truck);
      setFormData({
        placa: truck?.placa ?? "",
        capacidad: String(truck?.capacidad ?? ""),
        cargaActual: String(truck?.cargaActual ?? ""),
        estado: truck?.estado ?? "DISPONIBLE",
      });
      fetchLogs(truck.id);
    } else {
      setEditingTruck(null);
      setFormData({ placa: "", capacidad: "", cargaActual: "0", estado: "DISPONIBLE" });
      setLogs([]);
    }
    setError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTruck(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const url = editingTruck ? `/api/trucks/${editingTruck.id}` : "/api/trucks";
      const method = editingTruck ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Error al guardar");
        return;
      }

      closeModal();
      fetchTrucks();
      window.dispatchEvent(new CustomEvent("aquaflow-data-updated"));
    } catch (e) {
      setError("Error al guardar camión");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este camión?")) return;

    try {
      await fetch(`/api/trucks/${id}`, { method: "DELETE" });
      fetchTrucks();
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
            <h1 className="text-3xl font-bold text-gray-800">Camiones</h1>
            <p className="text-gray-600 mt-1">Gestión de la flota de vehículos</p>
          </div>
          <button
            onClick={() => openModal()}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-semibold hover:from-cyan-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl"
          >
            <Plus className="w-5 h-5" />
            Nuevo Camión
          </button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por placa o estado..."
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

        {/* Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : filteredTrucks.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <TruckIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p>No hay camiones registrados</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredTrucks?.map((truck, i) => (
              <motion.div
                key={truck?.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-cyan-50 rounded-xl">
                      <TruckIcon className="w-6 h-6 text-cyan-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-gray-800">{truck?.placa}</h3>
                      <p className="text-sm text-gray-500">
                        Cap: {(truck?.capacidad ?? 0)?.toLocaleString()} L
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={truck?.estado ?? "DISPONIBLE"} variant="truck" />
                </div>

                <CapacityIndicator current={truck?.cargaActual ?? 0} max={truck?.capacidad ?? 1} />

                <div className="flex gap-2 mt-4 pt-4 border-t">
                  <button
                    onClick={() => openModal(truck)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(truck?.id)}
                    className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={closeModal}
          title={editingTruck ? "Editar Camión" : "Nuevo Camión"}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Placa/Matrícula</label>
              <input
                type="text"
                value={formData.placa}
                onChange={(e) => setFormData({ ...formData, placa: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                placeholder="ABC-123" maxLength={10}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Capacidad (L)</label>
                <input
                  type="number"
                  value={formData.capacidad}
                  onChange={(e) => setFormData({ ...formData, capacidad: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  placeholder="8000"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Carga Actual (L)</label>
                <input
                  type="number"
                  value={formData.cargaActual}
                  onChange={(e) => setFormData({ ...formData, cargaActual: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select
                value={formData.estado}
                onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white"
              >
                {estadoOptions?.map((opt) => (
                  <option key={opt?.value} value={opt?.value}>
                    {opt?.label}
                  </option>
                ))}
              </select>
            </div>
            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>
            )}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-medium hover:from-cyan-700 hover:to-blue-700 transition-all disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>

            {editingTruck && (
              <div className="mt-8 border-t pt-6">
                <h4 className="text-lg font-bold text-gray-800 mb-4">Historial GPS (Últimos 50)</h4>
                {loadingLogs ? (
                  <div className="text-center py-4 text-gray-500">Cargando registros...</div>
                ) : logs.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">No hay registros recientes</div>
                ) : (
                  <div className="overflow-auto max-h-60 rounded-xl border border-gray-100">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 text-gray-600 font-medium sticky top-0">
                        <tr>
                          <th className="px-4 py-2">Hora</th>
                          <th className="px-4 py-2">Usuario</th>
                          <th className="px-4 py-2">Ubicación</th>
                          <th className="px-4 py-2">Velocidad</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {logs.map((log) => (
                          <tr key={log.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 whitespace-nowrap">
                              {new Date(log.timestamp).toLocaleTimeString()} {new Date(log.timestamp).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-2 text-gray-600">
                              {log.user?.name || log.user?.email?.split('@')[0] || "N/A"}
                            </td>
                            <td className="px-4 py-2 font-mono text-xs">
                              <a 
                                href={`https://www.google.com/maps?q=${log.lat},${log.lng}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline flex items-center gap-1"
                              >
                                {log.lat.toFixed(5)}, {log.lng.toFixed(5)}
                              </a>
                            </td>
                            <td className="px-4 py-2">{Math.round(log.speed || 0)} km/h</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}

