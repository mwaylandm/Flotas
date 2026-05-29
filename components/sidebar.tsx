"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import pkg from "../package.json";
import {
  LayoutDashboard,
  Truck,
  Users,
  ClipboardList,
  Menu,
  X,
  LogOut,
  Droplets,
  ChevronRight,
  UserCog,
  Lock,
  User,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";

const menuItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Camiones", href: "/trucks", icon: Truck, adminOnly: true },
  { name: "Clientes", href: "/clients", icon: Users },
  { name: "Órdenes de servicio", href: "/services", icon: ClipboardList, adminOnly: true },
  { name: "Reportes", href: "/reports", icon: BarChart3, adminOnly: true },
  { name: "Usuarios", href: "/users", icon: UserCog, adminOnly: true },
];

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isPwdModalOpen, setIsPwdModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdError, setPwdError] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState("");
  const pathname = usePathname();
  const sessionData = useSession();
  const session = sessionData?.data;

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    const host = window.location.host;
    window.location.href = `http://${host}/login`;
  };

  if (!mounted) {
    return null;
  }
  const ts = (pkg as any)?.version ?? "0.0.0";

  const resetPwdState = () => {
    setNewPassword("");
    setPwdError("");
    setPwdSuccess("");
    setPwdSaving(false);
  };

  const closePwdModal = () => {
    setIsPwdModalOpen(false);
    resetPwdState();
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError("");
    setPwdSuccess("");
    if (newPassword.length < 6) {
      setPwdError("La nueva contraseña debe tener al menos 6 caracteres");
      return;
    }
    setPwdSaving(true);
    try {
      const res = await fetch("/api/me/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwdError(data?.error ?? "Error al actualizar contraseña");
      } else {
        setPwdSuccess("Contraseña actualizada");
        setTimeout(() => {
          closePwdModal();
        }, 900);
      }
    } catch (err) {
      setPwdError("Error de red");
    } finally {
      setPwdSaving(false);
    }
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-cyan-600 text-white rounded-lg shadow-lg hover:bg-cyan-700 transition-colors"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full bg-gradient-to-b from-cyan-700 to-blue-800 text-white z-50 transition-transform duration-300 lg:translate-x-0 shadow-2xl",
          isOpen ? "translate-x-0" : "-translate-x-full",
          "w-64"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg">
                  <Droplets className="w-8 h-8 text-cyan-300" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">AquaFlow</h1>
                  <p className="text-xs text-cyan-200">Manager</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="lg:hidden p-1 hover:bg-white/10 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {menuItems?.map((item) => {
              const userRole = (session?.user as any)?.role;

              if (item.name === "Camiones" || item.name === "Usuarios" || item.name === "Reportes") {
                if (userRole !== "ADMIN") {
                  return null;
                }
              } else if (item.name === "Órdenes de servicio") {
                if (userRole !== "ADMIN" && userRole !== "ADMINISTRATIVO") {
                  return null;
                }
              }

              let href = item?.href ?? "/";
              if (item.name === "Dashboard" && userRole === "ADMINISTRATIVO") {
                href = "/administrativo-dashboard";
              }

              const Icon = item?.icon;
              const isActive = pathname === href;
              return (
                <Link
                  key={item?.name}
                  href={href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                    isActive
                      ? "bg-white text-cyan-700 shadow-lg"
                      : "hover:bg-white/10 text-white/80 hover:text-white"
                  )}
                >
                  {Icon && <Icon className="w-5 h-5" />}
                  <span className="font-medium">{item?.name}</span>
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                </Link>
              );
            })}
          </nav>

          {/* Menú inferior: Clave / Salir */}
          <div className="p-4 border-t border-white/10">
            <div className="bg-white/5 rounded-2xl p-3 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-cyan-500 flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold leading-tight truncate">
                    {session?.user?.name ?? "Usuario"}
                  </p>
                  <p className="text-xs text-cyan-100">
                    {(session?.user as any)?.role ?? "OPERADOR"}
                  </p>
                  <p className="text-[10px] text-cyan-100/80 mt-0.5">{ts}</p>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setIsPwdModalOpen(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-xl font-medium hover:bg-cyan-600 transition-all"
                >
                  <Lock className="w-4 h-4" />
                  <span>Clave</span>
                </button>
                <button
                  onClick={handleSignOut}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-900/80 text-white rounded-xl font-medium hover:bg-purple-900 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Salir</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <Modal
        isOpen={isPwdModalOpen}
        onClose={closePwdModal}
        title="Cambio de contraseña"
      >
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 border border-cyan-500 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              placeholder="Mínimo 6 caracteres"
              required
              minLength={6}
            />
          </div>
          {pwdError && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm">{pwdError}</div>}
          {pwdSuccess && <div className="p-3 bg-green-50 text-green-700 rounded-xl text-sm">{pwdSuccess}</div>}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={closePwdModal}
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pwdSaving}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-all disabled:opacity-50"
            >
              {pwdSaving ? "Guardando..." : "Confirmar"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
