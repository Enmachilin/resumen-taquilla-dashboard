"use client";

import { useState, useEffect } from "react";
import RegistroForm from "@/components/RegistroForm";
import ResumenCard from "@/components/ResumenCard";
import ComparativaView from "@/components/ComparativaView";
import { Locacion, RegistroDiario } from "@/types";
import { locacionService, registroService } from "@/services/firestore";

export default function Home() {
  const [view, setView] = useState<"dash" | "admin" | "comparativa">("dash");
  const [locaciones, setLocaciones] = useState<Locacion[]>([]);
  const [activeLocacion, setActiveLocacion] = useState<string>("all");
  const [activeYear, setActiveYear] = useState<number>(2026); // Valor estático para evitar mismatch de hidratación
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [activeStartMonth, setActiveStartMonth] = useState<number>(1);
  const [activeEndMonth, setActiveEndMonth] = useState<number>(12);
  const [registros, setRegistros] = useState<{ actual: RegistroDiario, anterior: RegistroDiario | null }[]>([]);
  const [totals, setTotals] = useState({ actual: 0, anterior: 0, actualBs: 0, anteriorBs: 0, avgTasa: 0 });
  const [monthsWithData, setMonthsWithData] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [hasSetSmartDefault, setHasSetSmartDefault] = useState(false);

  // Los años se calcularán dinámicamente a partir de los datos
  const MONTHS = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  useEffect(() => {
    // Establecer año actual de forma segura en el cliente
    setActiveYear(new Date().getFullYear());

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

      // Calcular años disponibles dinámicamente
      const years = Array.from(new Set(allRegs.map(r => parseInt(r.fecha.split("-")[0]))))
        .sort((a, b) => b - a); // Ordenar descendente
      setAvailableYears(years);

      // Si el año activo no tiene registros, seleccionar el más reciente disponible
      if (years.length > 0 && !years.includes(activeYear) && !hasSetSmartDefault) {
        setActiveYear(years[0]);
      }

      // Calcular meses con datos para el año y plaza activa
      const dataMonths = allRegs
        .filter(r => {
          const [y] = r.fecha.split("-").map(Number);
          const sameYear = y === activeYear;
          const sameLoc = activeLocacion === "all" || r.locacionId === activeLocacion;
          return sameYear && sameLoc;
        })
        .map(r => parseInt(r.fecha.split("-")[1]));
      setMonthsWithData(Array.from(new Set(dataMonths)));

      // SMART DEFAULT: Si es la primera carga y estamos en "Todas", 

      // SMART DEFAULT: Si es la primera carga y estamos en "Todas", 
      // seleccionar la plaza del registro más reciente.
      if (!hasSetSmartDefault && activeLocacion === "all" && allRegs.length > 0) {
        const mostRecent = allRegs[0]; // Están ordenados por fecha desc en el servicio
        setActiveLocacion(mostRecent.locacionId);
        setHasSetSmartDefault(true);
        setLoading(false); // Detener esta ejecución ya que el useEffect de dependencias disparará otro init
        return;
      }

      const data: { actual: RegistroDiario, anterior: RegistroDiario | null }[] = [];

      // Filtrar por plaza activa, AÑO y RANGO de MESES seleccionado
      let filteredRegs = allRegs.filter(r => {
        const [y, m] = r.fecha.split("-").map(Number);
        const inYear = y === activeYear;
        const inMonthRange = m >= activeStartMonth && m <= activeEndMonth;
        return inYear && inMonthRange;
      });

      if (activeLocacion !== "all") {
        filteredRegs = filteredRegs.filter(r => r.locacionId === activeLocacion);
      }

      let totalActual = 0;
      let totalAnterior = 0;
      let sumTasasActual = 0;
      let countTasasActual = 0;
      let sumTotalBs = 0;

      for (const actual of filteredRegs.slice(0, 50)) { // Aumentamos límite para mejor promedio
        const anterior = await registroService.getRegistroAnterior(actual.locacionId, actual.fecha);
        data.push({ actual, anterior });

        if (actual.status === "operativo") {
          totalActual += actual.tickets;
          sumTasasActual += actual.tasaDolar;
          sumTotalBs += actual.totalCalculado;
          countTasasActual++;
        }
        if (anterior && anterior.status === "operativo") {
          totalAnterior += anterior.tickets;
        }
      }

      const avgTasa = countTasasActual > 0 ? sumTasasActual / countTasasActual : 0;
      const totalActualBs = sumTotalBs;

      setRegistros(data);
      setTotals({
        actual: totalActual,
        anterior: totalAnterior,
        actualBs: totalActualBs,
        anteriorBs: 0, // No es crítico para el resumen global actual
        avgTasa: avgTasa
      });
    } catch (error: any) {
      console.error("Error en init:", error);
      setErrorStatus(error.message || "Error desconocido al conectar con Firebase");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isMounted) init();
  }, [activeLocacion, activeYear, activeStartMonth, activeEndMonth, view, isMounted]);


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
              className={`text-[10px] font-black uppercase px-3 py-2 rounded-lg border transition-all ${view === "admin" ? "bg-indigo-600 text-white border-indigo-600" : "bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-white"
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
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase whitespace-nowrap transition-all border-2 ${activeLocacion === "all"
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
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase whitespace-nowrap transition-all border-2 ${activeLocacion === l.id
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
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase whitespace-nowrap transition-all border ${activeYear === y
                      ? "bg-gray-900 text-white border-gray-900 shadow-sm"
                      : "bg-white text-gray-400 border-gray-100 hover:border-gray-200"
                      }`}
                  >
                    Año {y}
                  </button>
                ))}
              </div>

              {/* Filtro por Periodo de Meses */}
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Rango Seleccionado</p>
                    <h4 className="text-xl font-black text-indigo-600 flex items-center gap-2">
                      <span className="bg-indigo-50 px-2 py-0.5 rounded-lg">{MONTHS[activeStartMonth - 1]}</span>
                      <span className="text-gray-300 text-sm">→</span>
                      <span className="bg-indigo-50 px-2 py-0.5 rounded-lg">{MONTHS[activeEndMonth - 1]}</span>
                    </h4>
                  </div>
                  <button
                    onClick={() => { setActiveStartMonth(1); setActiveEndMonth(12); }}
                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors border border-indigo-100"
                    title="Ver año completo"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>

                <div className="relative h-16 pt-2">
                  {/* Track de fondo */}
                  <div className="absolute top-4 left-0 right-0 h-2.5 bg-gray-100 rounded-full"></div>

                  {/* Segmento Activo */}
                  <div
                    className="absolute top-4 h-2.5 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full shadow-[0_4px_12px_rgba(99,102,241,0.2)]"
                    style={{
                      left: `${((activeStartMonth - 1) / 11) * 100}%`,
                      width: `${((activeEndMonth - activeStartMonth) / 11) * 100}%`
                    }}
                  ></div>

                  {/* Range Sliders Invisibles */}
                  <div className="relative h-2.5">
                    <input
                      type="range" min="1" max="12" step="1"
                      value={activeStartMonth}
                      onChange={(e) => setActiveStartMonth(Math.min(parseInt(e.target.value), activeEndMonth))}
                      className="absolute top-0 w-full h-full appearance-none bg-transparent pointer-events-none cursor-pointer z-20 slider-range-custom"
                    />
                    <input
                      type="range" min="1" max="12" step="1"
                      value={activeEndMonth}
                      onChange={(e) => setActiveEndMonth(Math.max(parseInt(e.target.value), activeStartMonth))}
                      className="absolute top-0 w-full h-full appearance-none bg-transparent pointer-events-none cursor-pointer z-30 slider-range-custom"
                    />
                  </div>

                  {/* Etiquetas de Meses a lo largo de la linea */}
                  <div className="absolute top-10 left-0 w-full flex justify-between px-1">
                    {MONTHS.map((m, i) => {
                      const monthNum = i + 1;
                      const isActive = monthNum >= activeStartMonth && monthNum <= activeEndMonth;
                      const isEdge = monthNum === activeStartMonth || monthNum === activeEndMonth;
                      const hasData = monthsWithData.includes(monthNum);

                      return (
                        <div key={m} className="flex flex-col items-center min-w-[20px]">
                          <div className={`w-1 h-3 mb-1.5 transition-all duration-300 rounded-full ${hasData ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]' : isActive ? 'bg-indigo-400' : 'bg-gray-100'
                            }`}></div>
                          <span className={`text-[10px] md:text-[12px] font-black transition-all duration-300 flex items-center justify-center min-w-[1.5rem] min-h-[1.5rem] rounded-full ${hasData
                            ? 'text-amber-600 bg-amber-50 border border-amber-200 shadow-sm'
                            : isActive
                              ? 'text-indigo-600'
                              : 'text-gray-300'
                            } ${isEdge ? 'scale-125 ring-2 ring-indigo-400 z-10 bg-white' : ''}`}>
                            {m.substring(0, 1)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <style jsx global>{`
                  .slider-range-custom::-webkit-slider-thumb {
                    appearance: none;
                    width: 24px;
                    height: 24px;
                    background: white;
                    border: 4px solid #6366f1;
                    border-radius: 50%;
                    pointer-events: auto;
                    cursor: grab;
                    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
                    transition: all 0.2s;
                  }
                  .slider-range-custom::-webkit-slider-thumb:hover {
                    transform: scale(1.1);
                    border-color: #4f46e5;
                  }
                  .slider-range-custom::-webkit-slider-thumb:active {
                    cursor: grabbing;
                    transform: scale(0.95);
                  }
                  .slider-range-custom::-moz-range-thumb {
                    width: 20px;
                    height: 20px;
                    background: white;
                    border: 4px solid #6366f1;
                    border-radius: 50%;
                    pointer-events: auto;
                    cursor: grab;
                    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                  }
                `}</style>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                <div className="h-10 w-10 bg-indigo-100 rounded-full mb-4"></div>
                <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">Sincronizando...</p>
              </div>
            ) : registros.length > 0 ? (
              <div className="space-y-6">
                {/* Resumen Global */}
                <div className="bg-indigo-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                    <svg width="100" height="100" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" /></svg>
                  </div>
                  <div className="relative z-10">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] opacity-60">
                      Resumen {activeStartMonth === 1 && activeEndMonth === 12 ? `General ${activeYear}` : `Periodo ${MONTHS[activeStartMonth - 1]} - ${MONTHS[activeEndMonth - 1]} ${activeYear}`}
                    </h3>
                    <div className="flex items-baseline gap-4 mt-2">
                      <span className="text-5xl font-black">{totals.actual.toLocaleString()}</span>
                      <span className="text-sm font-bold opacity-60 uppercase">Tickets Totales</span>
                    </div>

                    <div className="mt-2 flex flex-col gap-1">
                      <div className="text-xl font-bold text-indigo-100">
                        ~ {totals.actualBs.toLocaleString('es-VE', { minimumFractionDigits: 0 })} <span className="text-xs uppercase opacity-60 font-black">Bs. Estimados</span>
                      </div>
                      <div className="text-[10px] font-black uppercase text-indigo-300 tracking-wider">
                        Basado en tasa promedio: {totals.avgTasa.toFixed(2)} Bs/USD
                      </div>
                    </div>

                    {totals.anterior > 0 && (
                      <div className="mt-4 flex items-center gap-2">
                        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${totals.actual >= totals.anterior ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                          }`}>
                          {totals.actual >= totals.anterior ? "↑ Incremento" : "↓ Descenso"} {(((totals.actual / totals.anterior) - 1) * 100).toFixed(1)}%
                        </div>
                        <span className="text-[10px] opacity-40 font-bold uppercase">vs año anterior ({totals.anterior.toLocaleString()})</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 md:gap-6">
                  {registros.map((reg, idx) => (
                    <ResumenCard key={idx} actual={reg.actual} anterior={reg.anterior} />
                  ))}
                </div>
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

        {view === "comparativa" && (
          <ComparativaView />
        )}

      </div>

      {/* Mobile Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around py-4 md:hidden z-20 shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
        <button onClick={() => setView("dash")} className={`flex flex-col items-center gap-1 transition-all ${view === "dash" ? "text-indigo-600 scale-110" : "text-gray-400 opacity-60 hover:opacity-100"}`}>
          <div className={`w-6 h-6 rounded-md border-2 transition-colors ${view === "dash" ? "border-indigo-600 bg-indigo-50" : "border-gray-400"}`}></div>
          <span className="text-[10px] font-black uppercase tracking-tighter">Resumen</span>
        </button>
        <button onClick={() => setView("comparativa")} className={`flex flex-col items-center gap-1 transition-all ${view === "comparativa" ? "text-indigo-600 scale-110" : "text-gray-400 opacity-60 hover:opacity-100"}`}>
          <div className={`w-6 h-6 rounded-md border-2 transition-colors flex items-center justify-center text-[10px] ${view === "comparativa" ? "border-indigo-600 bg-indigo-50" : "border-gray-400"}`}>📊</div>
          <span className="text-[10px] font-black uppercase tracking-tighter">Comparar</span>
        </button>
        <button onClick={() => setView("admin")} className={`flex flex-col items-center gap-1 transition-all ${view === "admin" ? "text-indigo-600 scale-110" : "text-gray-400 opacity-60 hover:opacity-100"}`}>
          <div className={`w-6 h-6 rounded-full border-2 transition-colors flex items-center justify-center font-black ${view === "admin" ? "border-indigo-600 bg-indigo-50" : "border-gray-400"}`}>+</div>
          <span className="text-[10px] font-black uppercase tracking-tighter">Reportar</span>
        </button>
      </nav>
    </main>
  );
}
