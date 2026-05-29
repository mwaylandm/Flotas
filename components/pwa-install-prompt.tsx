"use client";

import { useEffect, useState } from "react";
import { Download, X, HelpCircle, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check if running in standalone mode (already installed)
    const isStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes("android-app://");

    setIsStandalone(isStandaloneMode);

    // Check if iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  if (!mounted || isStandalone) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {deferredPrompt ? (
        <Button 
          onClick={handleInstallClick} 
          className="shadow-lg bg-sky-600 hover:bg-sky-700 text-white gap-2 rounded-full px-6"
        >
          <Download className="h-4 w-4" />
          Instalar App
        </Button>
      ) : (
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="shadow-lg bg-white/90 backdrop-blur border-sky-200 text-sky-700 gap-2 rounded-full">
              <Download className="h-4 w-4" />
              Instalar App
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Instalar AquaFlow</DialogTitle>
              <DialogDescription>
                Sigue estos pasos para instalar la aplicación en tu dispositivo:
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {isIOS ? (
                <div className="flex flex-col gap-3">
                  <p className="flex items-center gap-2">
                    1. Toca el botón <Share className="h-4 w-4" /> <strong>Compartir</strong> en la barra inferior.
                  </p>
                  <p>
                    2. Desliza hacia abajo y selecciona <strong>"Añadir a la pantalla de inicio"</strong>.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <p className="flex items-center gap-2">
                    1. Toca el menú de <strong>3 puntos</strong> <span className="text-xl leading-none">⋮</span> en la esquina superior derecha del navegador.
                  </p>
                  <p className="flex items-center gap-2">
                    2. Selecciona <strong>"Instalar aplicación"</strong> o <strong>"Añadir a pantalla de inicio"</strong>.
                  </p>
                  <div className="bg-amber-50 p-3 rounded-md text-amber-800 text-sm mt-2">
                    <p><strong>Nota:</strong> Si no ves la opción, asegúrate de haber aceptado el certificado de seguridad (Sitio no seguro) al ingresar.</p>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
