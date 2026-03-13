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
          <div className="flex gap-2">
            <button
              onClick={() => setView(view === "admin" ? "comparativa" : "admin")}
              className={`text-[10px] font-black uppercase px-3 py-2 rounded-lg border transition-all ${view === "admin" ? "bg-indigo-600 text-white border-indigo-600" : "bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-white"
                }`}
            >
              {view === "admin" ? "Dashboard" : "Cargar +"}
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
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <RegistroForm />
          </div>
        )}

        {view === "comparativa" && (
          <ComparativaView />
        )}

      </div>

      {/* Mobile Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around py-4 md:hidden z-20 shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
        <button onClick={() => setView("comparativa")} className={`flex flex-col items-center gap-1 transition-all ${view === "comparativa" ? "text-indigo-600 scale-110" : "text-gray-400 opacity-60 hover:opacity-100"}`}>
          <div className={`w-8 h-8 rounded-xl border-2 transition-colors flex items-center justify-center text-lg ${view === "comparativa" ? "border-indigo-600 bg-indigo-50 shadow-sm" : "border-gray-300"}`}>📊</div>
          <span className="text-[10px] font-black uppercase tracking-tighter">Comparativa</span>
        </button>
        <button onClick={() => setView("admin")} className={`flex flex-col items-center gap-1 transition-all ${view === "admin" ? "text-indigo-600 scale-110" : "text-gray-400 opacity-60 hover:opacity-100"}`}>
          <div className={`w-8 h-8 rounded-full border-2 transition-colors flex items-center justify-center font-black text-lg ${view === "admin" ? "border-indigo-600 bg-indigo-50 shadow-sm" : "border-gray-300"}`}>+</div>
          <span className="text-[10px] font-black uppercase tracking-tighter">Reportar</span>
        </button>
      </nav>
    </main>
  );
}
