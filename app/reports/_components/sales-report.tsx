"use client";

import {
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { DollarSign, Activity, Droplets, TrendingUp } from "lucide-react";

interface SalesData {
  summary: {
    totalSales: number;
    totalSalesNatural: number;
    totalSalesJuridica: number;
    totalServices: number;
    totalVolume: number;
    averageTicket: number;
  };
  daily: Array<{
    date: string;
    amount: number;
    amountNatural: number;
    amountJuridica: number;
    count: number;
    volume: number;
  }>;
}

export function SalesReport({ data }: { data: SalesData }) {
  // Format date for chart
  const chartData = data.daily.map((item) => {
    // La fecha ya viene como YYYY-MM-DD desde el backend.
    const [year, month, day] = item.date.split("-").map(Number);
    const dateObj = new Date(year, month - 1, day);
    
    return {
      ...item,
      formattedDate: dateObj.toLocaleDateString("es-CL", {
        day: "2-digit",
        month: "short",
      }),
    };
  });

  const pieData = [
    { name: "Persona Natural", value: data.summary.totalSalesNatural },
    { name: "Persona Jurídica", value: data.summary.totalSalesJuridica },
  ];

  const pieColors = ["#0ea5e9", "#a855f7"];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-50 rounded-xl">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <TrendingUp className="w-5 h-5 text-gray-400" />
          </div>
          <h3 className="text-sm text-gray-500 font-medium">Venta Total</h3>
          <p className="text-2xl font-bold text-gray-800 mt-1">
            ${data.summary.totalSales.toLocaleString("es-CL")}
          </p>
          <div className="mt-3 space-y-1 text-sm">
            <div className="flex items-center justify-between text-gray-600">
              <span>Persona Natural</span>
              <span className="font-semibold text-gray-800">
                ${data.summary.totalSalesNatural.toLocaleString("es-CL")}
              </span>
            </div>
            <div className="flex items-center justify-between text-gray-600">
              <span>Persona Jurídica</span>
              <span className="font-semibold text-gray-800">
                ${data.summary.totalSalesJuridica.toLocaleString("es-CL")}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 rounded-xl">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <h3 className="text-sm text-gray-500 font-medium">Total Servicios</h3>
          <p className="text-2xl font-bold text-gray-800 mt-1">
            {data.summary.totalServices}
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-50 rounded-xl">
              <Droplets className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <h3 className="text-sm text-gray-500 font-medium">Volumen Total</h3>
          <p className="text-2xl font-bold text-gray-800 mt-1">
            {data.summary.totalVolume.toLocaleString("es-CL")} L
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-amber-50 rounded-xl">
              <DollarSign className="w-6 h-6 text-amber-600" />
            </div>
          </div>
          <h3 className="text-sm text-gray-500 font-medium">Ticket Promedio</h3>
          <p className="text-2xl font-bold text-gray-800 mt-1">
            ${Math.round(data.summary.averageTicket).toLocaleString("es-CL")}
          </p>
        </div>
      </div>

      {/* Sales Chart */}
      <div className="bg-white p-6 rounded-2xl shadow-lg">
        <h3 className="text-lg font-bold text-gray-800 mb-6">Evolución de Ventas</h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          <div className="h-80 lg:col-span-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="formattedDate"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#6b7280", fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#6b7280", fontSize: 12 }}
                  tickFormatter={(value) => `$${value / 1000}k`}
                />
                <Tooltip
                  contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}
                  formatter={(value: number, name: string) => {
                    const label =
                      name === "amount" ? "Total" :
                      name === "amountNatural" ? "Persona Natural" :
                      name === "amountJuridica" ? "Persona Jurídica" :
                      name;
                    return [`$${value.toLocaleString("es-CL")}`, label];
                  }}
                />
                <Legend />
                <Bar dataKey="amount" name="Total" fill="#111827" radius={[6, 6, 0, 0]} />
                <Bar dataKey="amountNatural" name="Persona Natural" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                <Bar dataKey="amountJuridica" name="Persona Jurídica" fill="#a855f7" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="h-80">
            <div className="h-full flex flex-col">
              <h4 className="text-sm font-semibold text-gray-700 mb-4">Distribución por tipo</h4>
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip
                      contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}
                      formatter={(value: number) => [`$${value.toLocaleString("es-CL")}`, "Monto"]}
                    />
                    <Legend />
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={2}
                    >
                      {pieData.map((_, idx) => (
                        <Cell key={idx} fill={pieColors[idx]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-800">Detalle Diario</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Cant. Servicios</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Volumen</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Venta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.daily.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No hay datos para el periodo seleccionado
                  </td>
                </tr>
              ) : (
                data.daily.map((day) => {
                  const [y, m, d] = day.date.split("-").map(Number);
                  const dateObj = new Date(y, m - 1, d);
                  return (
                    <tr key={day.date} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                        {dateObj.toLocaleDateString("es-CL", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{day.count}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{day.volume.toLocaleString("es-CL")} L</td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">
                        ${day.amount.toLocaleString("es-CL")}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
