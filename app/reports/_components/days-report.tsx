"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

interface DayData {
  dayIndex: number; // 0-6
  name: string;
  amount: number;
  count: number;
  occurrences: number;
}

export function DaysReport({ data }: { data: DayData[] }) {
  const sortMondayFirst = (a: DayData, b: DayData) => ((a.dayIndex + 6) % 7) - ((b.dayIndex + 6) % 7);
  const ordered = [...data].sort(sortMondayFirst);
  
  // Calcular el promedio para el gráfico (Monto Total / Número de ocurrencias de ese día en el periodo)
  const chartData = ordered.map(item => ({
    ...item,
    // Si no hay ocurrencias (data sucia o rango inválido), evitar división por cero
    average: item.occurrences > 0 ? Math.round(item.amount / item.occurrences) : 0
  }));
  
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-lg">
        <h3 className="text-lg font-bold text-gray-800 mb-2">Ingresos por Día de la Semana</h3>
        <p className="text-sm text-gray-500 mb-6">Acumulado del periodo seleccionado</p>
        
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="name" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#6b7280", fontSize: 12 }}
              />
              <YAxis 
                yAxisId="left"
                orientation="left"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#6b7280", fontSize: 12 }}
                tickFormatter={(value) => `$${value / 1000}k`}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#6b7280", fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}
                formatter={(value: number, name: string) => [
                  name === "Monto servicios" || name === "Promedio" ? `$${value.toLocaleString("es-CL")}` : value,
                  name
                ]}
              />
              <Legend />
              <Bar 
                yAxisId="left"
                dataKey="amount" 
                name="Monto servicios" 
                fill="#0ea5e9" 
                radius={[4, 4, 0, 0]} 
                barSize={40}
              />
              <Bar 
                yAxisId="left"
                dataKey="average"
                name="Promedio"
                fill="#8b5cf6"
                radius={[4, 4, 0, 0]}
                barSize={40}
              />
              <Bar 
                yAxisId="right"
                dataKey="count" 
                name="Cantidad Servicios" 
                fill="#f59e0b" 
                radius={[4, 4, 0, 0]} 
                barSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table Summary */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-800">Resumen Semanal</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Día</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Cantidad Servicios</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Monto servicios</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Promedio / Día</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ordered.map((day) => (
                <tr key={day.dayIndex} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{day.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 text-center">{day.count}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">${day.amount.toLocaleString("es-CL")}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 text-right">
                    ${day.occurrences > 0 ? Math.round(day.amount / day.occurrences).toLocaleString("es-CL") : 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
