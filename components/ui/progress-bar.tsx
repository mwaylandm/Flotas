"use client";

import { cn } from "@/lib/utils";

interface ProgressBarProps {
  progress: string;
  isJuridica?: boolean;
}

const progressValuesNatural: Record<string, number> = {
  PENDIENTE: 0,
  EN_CAMINO: 33,
  OPERANDO: 66,
  COMPLETADO: 100,
  FACTURACION_PENDIENTE: 100,
  FACTURACION_TERMINADA: 100,
  TERMINADA_CONTABILIZADA: 100,
  PAGO_REALIZADO_Y_CONTABILIZADO: 100,
};

const progressValuesJuridica: Record<string, number> = {
  PENDIENTE: 0,
  EN_CAMINO: 15,
  OPERANDO: 30,
  COMPLETADO: 50,
  FACTURACION_PENDIENTE: 65,
  FACTURACION_TERMINADA: 80,
  TERMINADA_CONTABILIZADA: 90,
  PAGO_REALIZADO_Y_CONTABILIZADO: 100,
};

const progressColors: Record<string, string> = {
  PENDIENTE: "bg-gray-400",
  EN_CAMINO: "bg-amber-500",
  OPERANDO: "bg-blue-500",
  COMPLETADO: "bg-green-500",
  FACTURACION_PENDIENTE: "bg-purple-500",
  FACTURACION_TERMINADA: "bg-indigo-500",
  TERMINADA_CONTABILIZADA: "bg-slate-500",
  PAGO_REALIZADO_Y_CONTABILIZADO: "bg-cyan-500",
};

export function ProgressBar({ progress, isJuridica = false }: ProgressBarProps) {
  const values = isJuridica ? progressValuesJuridica : progressValuesNatural;
  const value = values?.[progress] ?? 0;
  const color = progressColors?.[progress] ?? "bg-gray-400";

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>Progreso</span>
        <span>{value}%</span>
      </div>
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={cn("h-full transition-all duration-500 rounded-full", color)}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
