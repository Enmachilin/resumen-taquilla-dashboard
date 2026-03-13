"use client";

import { useState, useEffect } from "react";
import RegistroForm from "@/components/RegistroForm";
import ComparativaView from "@/components/ComparativaView";

export default function Home() {
  const [view, setView] = useState<"admin" | "comparativa">("comparativa");
  const [isMounted, setIsMounted] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);


  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 pb-24">
      {/* Header */}
      <header className="bg-white px-6 py-4 shadow-sm sticky top-0 z-20">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1
            className="text-xl font-extrabold tracking-tight text-indigo-900"
          >
            RESUMEN<span className="text-indigo-600">TAQUILLA</span>
          </h1>

          <div className="flex bg-gray-100 p-1 rounded-xl relative w-36 sm:w-64 shadow-inner border border-gray-100">
            {/* Indicador de fondo animado */}
            <div 
              className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] bg-white rounded-lg shadow-sm transition-all duration-300 ease-in-out ${
                view === "comparativa" ? "translate-x-0" : "translate-x-[calc(100%+4px)]"
              }`}
            />
            <button
              onClick={() => setView("comparativa")}
              className={`relative flex-1 py-1.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-colors z-10 flex items-center justify-center gap-1 ${
                view === "comparativa" ? "text-indigo-600" : "text-gray-400 opacity-60 hover:opacity-100"
              }`}
            >
              <span className="text-xs">📈</span>
              <span className="hidden sm:inline">Analítica</span>
            </button>
            <button
              onClick={() => setView("admin")}
              className={`relative flex-1 py-1.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-colors z-10 flex items-center justify-center gap-1 ${
                view === "admin" ? "text-indigo-600" : "text-gray-400 opacity-60 hover:opacity-100"
              }`}
            >
              <span className="text-xs">✍️</span>
              <span className="hidden sm:inline">Reportar</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-2 md:px-4 py-6">
        {errorStatus && (
          <div className="mt-8 p-4 bg-red-50 border-2 border-red-100 rounded-2xl text-red-600 text-sm font-bold animate-bounce">
            ⚠️ ERROR: {errorStatus}
            <p className="mt-2 text-xs font-normal opacity-80">Verifica las variables de entorno NEXT_PUBLIC en Netlify.</p>
          </div>
        )}

        {view === "admin" && (
          <div className="animate-in fade-in duration-300">
            <RegistroForm />
          </div>
        )}

        {view === "comparativa" && (
          <ComparativaView />
        )}

      </div>


    </main>
  );
}
