"use client";

import { DollarSign, AlertCircle, CheckCircle2 } from "lucide-react";

interface CommissionData {
  truckId: string;
  plate: string;
  totalGenerated: number;
  totalCommission: number;
  paidCommission: number;
  pendingCommission: number;
}

export function CommissionReport({ data }: { data: CommissionData[] }) {
  const totalPending = data.reduce((acc, curr) => acc + curr.pendingCommission, 0);
  const totalPaid = data.reduce((acc, curr) => acc + curr.paidCommission, 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-green-500">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-50 rounded-xl">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <h3 className="text-sm text-gray-500 font-medium">Comisiones Pagadas</h3>
          <p className="text-2xl font-bold text-gray-800 mt-1">
            ${totalPaid.toLocaleString("es-CL")}
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-amber-500">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-amber-50 rounded-xl">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
          </div>
          <h3 className="text-sm text-gray-500 font-medium">Comisiones Pendientes</h3>
          <p className="text-2xl font-bold text-gray-800 mt-1">
            ${totalPending.toLocaleString("es-CL")}
          </p>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-800">Detalle por Camión</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Camión</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Generado</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Comisión Total</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-green-600 uppercase tracking-wider">Pagado</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-amber-600 uppercase tracking-wider">Pendiente</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No hay datos de comisiones para el periodo seleccionado
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr key={item.truckId} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.plate}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 text-right">${item.totalGenerated.toLocaleString("es-CL")}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">${item.totalCommission.toLocaleString("es-CL")}</td>
                    <td className="px-6 py-4 text-sm font-medium text-green-600 text-right">${item.paidCommission.toLocaleString("es-CL")}</td>
                    <td className="px-6 py-4 text-sm font-medium text-amber-600 text-right">${item.pendingCommission.toLocaleString("es-CL")}</td>
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
