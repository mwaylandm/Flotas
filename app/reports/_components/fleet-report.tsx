"use client";

import { Truck, Droplets } from "lucide-react";

interface FleetData {
  truckId: string;
  plate: string;
  serviceCount: number;
  totalVolume: number;
  averageVolume: number;
}

export function FleetReport({ data }: { data: FleetData[] }) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-800">Rendimiento de Flota</h3>
          <div className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-sm font-medium">
            {data.length} Camiones Activos
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Camión</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Servicios</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Volumen Total</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Promedio L/Servicio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No hay datos de flota para el periodo seleccionado
                  </td>
                </tr>
              ) : (
                data.map((truck) => (
                  <tr key={truck.truckId} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-gray-400" />
                        {truck.plate}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 text-center">{truck.serviceCount}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Droplets className="w-3 h-3 text-purple-400" />
                        {truck.totalVolume.toLocaleString("es-CL")} L
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                      {Math.round(truck.averageVolume).toLocaleString("es-CL")} L
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
