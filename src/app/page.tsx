"use client";

import { useState, useEffect } from "react";
import RegistroForm from "@/components/RegistroForm";
import ResumenCard from "@/components/ResumenCard";
import { Locacion, RegistroDiario } from "@/types";
import { locacionService, registroService } from "@/services/firestore";

export default function Home() {
  const [view, setView] = useState<"dash" | "admin">("dash");
  const [locaciones, setLocaciones] = useState<Locacion[]>([]);
  const [activeLocacion, setActiveLocacion] = useState<string>("all");
  const [activeYear, setActiveYear] = useState<number>(new Date().getFullYear());
  const [registros, setRegistros] = useState<{actual: RegistroDiario, anterior: RegistroDiario | null}[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Años disponibles para el filtro (ej: desde 2024 hasta el actual)
  const availableYears = [2024, 2025, 2026];

  useEffect(() => {
    setIsMounted(true);
    // Recuperar última plaza activa
    const savedLoc = localStorage.getItem("lastActiveLocacion");
    if (savedLoc) setActiveLocacion(savedLoc);
    
    // Recuperar último año activo
    const savedYear = localStorage.getItem("lastActiveYear");
    if (savedYear) setActiveYear(parseInt(savedYear));
  }, []);

  // Guardar preferencias cuando cambien
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem("lastActiveLocacion", activeLocacion);
      localStorage.setItem("lastActiveYear", activeYear.toString());
    }
  }, [activeLocacion, activeYear, isMounted]);

  const init = async () => {
    setLoading(true);
    try {
      const locs = await locacionService.getLocaciones();
      setLocaciones(locs);
      
      // Obtener todos los registros recientes para mostrar algo
      const allRegs = await registroService.getAllRegistros();
      
      const data: {actual: RegistroDiario, anterior: RegistroDiario | null}[] = [];
      
      // Filtrar por plaza activa y por AÑO seleccionado
      let filteredRegs = allRegs.filter(r => r.fecha.startsWith(activeYear.toString()));
      
      if (activeLocacion !== "all") {
        filteredRegs = filteredRegs.filter(r => r.locacionId === activeLocacion);
      }

      // Para cada registro actual, intentar buscar su comparativa del año anterior
      for (const actual of filteredRegs.slice(0, 10)) { 
        const anterior = await registroService.getRegistroAnterior(actual.locacionId, actual.fecha);
        data.push({ actual, anterior });
      }
      
      setRegistros(data);
    } catch (error: any) {
      console.error("Error en init:", error);
      setErrorStatus(error.message || "Error desconocido al conectar con Firebase");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isMounted) init();
  }, [activeLocacion, activeYear, view, isMounted]);

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 pb-24">
      {/* Header */}
      <header className="bg-white px-6 py-4 shadow-sm sticky top-0 z-20">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 
            className="text-xl font-extrabold tracking-tight text-indigo-900 cursor-pointer"
            onClick={() => setView("dash")}
          >
            RESUMEN<span className="text-indigo-600">TAQUILLA</span>
          </h1>
          <div className="flex gap-2">
            <button 
              onClick={() => setView(view === "dash" ? "admin" : "dash")}
              className={`text-[10px] font-black uppercase px-3 py-2 rounded-lg border transition-all ${
                view === "admin" ? "bg-indigo-600 text-white border-indigo-600" : "bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-white"
              }`}
            >
              {view === "dash" ? "Cargar +" : "Dashboard"}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6">
        {view === "dash" && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest">Filtrar por Plaza</h2>
              </div>
              
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2">
                <button
                  onClick={() => setActiveLocacion("all")}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase whitespace-nowrap transition-all border-2 ${
                    activeLocacion === "all"
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100 scale-105"
                      : "bg-white text-gray-400 border-gray-100 hover:border-gray-200"
                  }`}
                >
                  Todas
                </button>
                {locaciones.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setActiveLocacion(l.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase whitespace-nowrap transition-all border-2 ${
                      activeLocacion === l.id
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100 scale-105"
                        : "bg-white text-gray-400 border-gray-100 hover:border-gray-200"
                    }`}
                  >
                    {l.nombre}
                  </button>
                ))}
              </div>

              {/* Filtro por Año */}
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2">
                {availableYears.map((y) => (
                  <button
                    key={y}
                    onClick={() => setActiveYear(y)}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase whitespace-nowrap transition-all border ${
                      activeYear === y
                        ? "bg-gray-900 text-white border-gray-900 shadow-sm"
                        : "bg-white text-gray-400 border-gray-100 hover:border-gray-200"
                    }`}
                  >
                    Año {y}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                <div className="h-10 w-10 bg-indigo-100 rounded-full mb-4"></div>
                <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">Sincronizando...</p>
              </div>
            ) : registros.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {registros.map((reg, idx) => (
                  <ResumenCard key={idx} actual={reg.actual} anterior={reg.anterior} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200 shadow-sm">
                <div className="text-4xl mb-4">📊</div>
                <p className="text-gray-400 font-bold px-10">No hay registros reportados para hoy todavía.</p>
                <button 
                  onClick={() => setView("admin")}
                  className="mt-6 bg-indigo-600 text-white font-black px-6 py-3 rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all"
                >
                  CARGAR PRIMER REPORTE
                </button>
              </div>
            )}
          </div>
        )}

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

      </div>

      {/* Mobile Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around py-4 md:hidden z-20 shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
        <button onClick={() => setView("dash")} className={`flex flex-col items-center gap-1 transition-all ${view === "dash" ? "text-indigo-600 scale-110" : "text-gray-400 opacity-60 hover:opacity-100"}`}>
          <div className={`w-6 h-6 rounded-md border-2 transition-colors ${view === "dash" ? "border-indigo-600 bg-indigo-50" : "border-gray-400"}`}></div>
          <span className="text-[10px] font-black uppercase tracking-tighter">Resumen</span>
        </button>
        <button onClick={() => setView("admin")} className={`flex flex-col items-center gap-1 transition-all ${view === "admin" ? "text-indigo-600 scale-110" : "text-gray-400 opacity-60 hover:opacity-100"}`}>
          <div className={`w-6 h-6 rounded-full border-2 transition-colors flex items-center justify-center font-black ${view === "admin" ? "border-indigo-600 bg-indigo-50" : "border-gray-400"}`}>+</div>
          <span className="text-[10px] font-black uppercase tracking-tighter">Reportar</span>
        </button>
      </nav>
    </main>
  );
}
