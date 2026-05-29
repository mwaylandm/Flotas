"use client";

import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  variant?: "truck" | "progress";
}

const truckStatusConfig: Record<string, { label: string; className: string }> = {
  DISPONIBLE: { label: "Disponible", className: "bg-green-100 text-green-700 border-green-200" },
  EN_SERVICIO: { label: "En Servicio", className: "bg-blue-100 text-blue-700 border-blue-200" },
  MANTENIMIENTO: { label: "Mantenimiento", className: "bg-amber-100 text-amber-700 border-amber-200" },
};

const progressStatusConfig: Record<string, { label: string; className: string }> = {
  PENDIENTE: { label: "Pendiente", className: "bg-gray-100 text-gray-700 border-gray-200" },
  EN_CAMINO: { label: "En Camino", className: "bg-amber-100 text-amber-700 border-amber-200" },
  OPERANDO: { label: "Operando", className: "bg-blue-100 text-blue-700 border-blue-200" },
  COMPLETADO: { label: "Completada", className: "bg-green-100 text-green-700 border-green-200" },
  FACTURACION_PENDIENTE: { label: "Facturación Pendiente", className: "bg-purple-100 text-purple-700 border-purple-200" },
  FACTURACION_TERMINADA: { label: "En proceso de facturación", className: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  TERMINADA_CONTABILIZADA: { label: "Facturada y enviada", className: "bg-slate-100 text-slate-700 border-slate-200" },
  PAGO_REALIZADO_Y_CONTABILIZADO: { label: "Pago realizado y contabilizado", className: "bg-cyan-100 text-cyan-700 border-cyan-200" },
};

export function StatusBadge({ status, variant = "truck" }: StatusBadgeProps) {
  const config = variant === "truck" ? truckStatusConfig : progressStatusConfig;
  const statusInfo = config?.[status] ?? { label: status, className: "bg-gray-100 text-gray-700" };

  return (
    <span
      className={cn(
        "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border",
        statusInfo?.className
      )}
    >
      {statusInfo?.label}
    </span>
  );
}
