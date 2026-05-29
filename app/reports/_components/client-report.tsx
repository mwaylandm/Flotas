"use client";

import { Users, Award } from "lucide-react";

interface ClientData {
  clientId: string;
  name: string;
  totalSpent: number;
  serviceCount: number;
  lastServiceDate: string;
}

export function ClientReport({ data }: { data: ClientData[] }) {
  // Top 3 clients
  const topClients = data.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Top Clients Podium */}
      {topClients.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {topClients.map((client, index) => (
            <div 
              key={client.clientId} 
              className={`bg-white p-6 rounded-2xl shadow-lg relative overflow-hidden ${
                index === 0 ? "border-2 border-yellow-400" : index === 1 ? "border-2 border-gray-300" : "border-2 border-amber-600"
              }`}
            >
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Award className="w-24 h-24" />
              </div>
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                  index === 0 ? "bg-yellow-400" : index === 1 ? "bg-gray-400" : "bg-amber-600"
                }`}>
                  {index + 1}
                </div>
                <h3 className="font-bold text-gray-800 line-clamp-1">{client.name}</h3>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-2">${client.totalSpent.toLocaleString("es-CL")}</p>
              <p className="text-sm text-gray-500">{client.serviceCount} servicios</p>
            </div>
          ))}
        </div>
      )}

      {/* Detailed Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-800">Ranking de Clientes</h3>
          <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
            {data.length} Clientes Activos
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">N° Servicios</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Monto Total</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Último Servicio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No hay datos de clientes para el periodo seleccionado
                  </td>
                </tr>
              ) : (
                data.map((client) => (
                  <tr key={client.clientId} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        {client.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 text-center">{client.serviceCount}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">${client.totalSpent.toLocaleString("es-CL")}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 text-right">
                      {new Date(client.lastServiceDate).toLocaleDateString("es-CL")}
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
