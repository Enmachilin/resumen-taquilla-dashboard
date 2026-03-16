"use client";

import { useState, useEffect, useRef } from "react";
import { Locacion, RegistroDiario, RegistroStatus } from "@/types";
import { registroService } from "@/services/firestore";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, doc } from "firebase/firestore";

const StatusIcon = ({ value }: { value: RegistroStatus }) => {
  switch (value) {
    case 'operativo':
      return <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
    case 'lluvia':
      return <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 19v1m2-1v1m-4-1v1m2-5l-1.5 2.5m3.5-2.5L14 16.5" /></svg>;
    case 'otro':
      return <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;
    default:
      return null;
  }
};

const STATUS_OPTIONS: { value: RegistroStatus; label: string; color: string; bg: string }[] = [
  { value: "operativo", label: "Operativo", color: "text-indigo-700", bg: "bg-indigo-50 border-indigo-200" },
  { value: "lluvia",    label: "Lluvia",    color: "text-blue-700",   bg: "bg-blue-50 border-blue-200" },
  { value: "otro",      label: "Otro...",   color: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
];

const TOTAL_STEPS = 4;

export default function RegistroForm() {
  // Cargar caché inicial si existe para que sea instantáneo
  const [locaciones, setLocaciones] = useState<Locacion[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cached_locaciones');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  
  const [loading, setLoading] = useState(false);
  const [fetchingTasa, setFetchingTasa] = useState(false);
  const [message, setMessage] = useState<string | React.ReactNode>("");
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [animating, setAnimating] = useState(false);
  const [existingRegistro, setExistingRegistro] = useState<RegistroDiario | null>(null);
  const [saved, setSaved] = useState(false);

  // Inicializar locacionId de la caché si existe
  useEffect(() => {
    if (locaciones.length > 0 && !formData.locacionId) {
      setFormData(prev => ({ ...prev, locacionId: locaciones[0].id }));
    }
  }, []);

  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split("T")[0],
    locacionId: "",
    tickets: 0,
    precioTicket: "1",
    tasaDolar: 36.5,
    status: "operativo" as RegistroStatus,
    motivoInactividad: "",
    comentarios: "",
  });

  useEffect(() => {
    // 1. Escuchar Locaciones en tiempo real
    const qLocs = query(collection(db, "puntos_venta"), orderBy("nombre"));
    const unsubLocs = onSnapshot(qLocs, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Locacion));
      setLocaciones(data);
      localStorage.setItem('cached_locaciones', JSON.stringify(data));
      
      if (data.length > 0 && !formData.locacionId) {
        setFormData(prev => ({ ...prev, locacionId: data[0].id }));
      }
    });

    fetchTasaBCV();

    return () => unsubLocs();
  }, []);

  useEffect(() => {
    if (formData.fecha && formData.locacionId) {
      const id = `${formData.fecha}_${formData.locacionId}`;
      const unsubReg = onSnapshot(doc(db, "registros_diarios", id), (docSnap) => {
        if (docSnap.exists()) {
          setExistingRegistro(docSnap.data() as RegistroDiario);
        } else {
          setExistingRegistro(null);
        }
      });
      return () => unsubReg();
    } else {
      setExistingRegistro(null);
    }
  }, [formData.fecha, formData.locacionId]);

  async function fetchTasaBCV() {
    setFetchingTasa(true);
    try {
      const response = await fetch("https://ve.dolarapi.com/v1/dolares/oficial");
      const data = await response.json();
      if (data?.promedio) {
        setFormData(prev => ({ ...prev, tasaDolar: Math.round(data.promedio * 100) / 100 }));
      }
    } catch {}
    finally { setFetchingTasa(false); }
  }



  async function handleSubmit() {
    setLoading(true);
    setMessage("");
    try {
      const id = `${formData.fecha}_${formData.locacionId}`;
      const precioNeto = parseFloat(formData.precioTicket) || 0;
      const totalCalculado = formData.tickets * precioNeto * formData.tasaDolar;

      await registroService.saveRegistro({
        ...formData,
        id,
        tickets: Number(formData.tickets),
        precioTicket: Number(precioNeto),
        tasaDolar: Number(formData.tasaDolar.toFixed(2)),
        totalCalculado: Number(totalCalculado.toFixed(2)),
      });
      setSaved(true);
    } catch {
      setMessage(
        <div className="flex items-center gap-2 text-red-600 font-black">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Error al guardar el registro
        </div>
      );
    } finally {
      setLoading(false);
    }
  }

  function goTo(next: number) {
    if (animating) return;
    setDirection(next > step ? "forward" : "backward");
    setAnimating(true);
    setTimeout(() => {
      setStep(next);
      setAnimating(false);
    }, 220);
  }

  function resetForm() {
    setSaved(false);
    setStep(1);
    setMessage("");
    setExistingRegistro(null);
    setFormData(prev => ({
      ...prev,
      tickets: 0,
      motivoInactividad: "",
      comentarios: "",
    }));
  }

  // ─── step validations ───
  const step1Valid = !!formData.fecha && !!formData.locacionId;
  const step2Valid = !!formData.status;
  const step3Valid = formData.status === "operativo"
    ? formData.tickets > 0 && parseFloat(formData.precioTicket) > 0
    : true; // Para Lluvia/Otro permitimos 0 o más tickets

  const precioNeto = parseFloat(formData.precioTicket) || 0;
  const totalUSD = formData.tickets * precioNeto;
  const totalBs = totalUSD * formData.tasaDolar;
  const locNombre = locaciones.find(l => l.id === formData.locacionId)?.nombre ?? "";
  const statusInfo = STATUS_OPTIONS.find(s => s.value === formData.status) || STATUS_OPTIONS[0];

  // ─── animation classes ───
  const slideClass = animating
    ? "opacity-0"
    : "opacity-100 transition-opacity duration-200";

  // ─── SAVED screen ───
  if (saved) return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6 animate-in fade-in zoom-in duration-500 text-center">
      <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center shadow-lg shadow-indigo-100">
        <svg className="w-12 h-12 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div>
        <p className="text-2xl font-black text-indigo-900">
          {existingRegistro ? "Sobreescrito" : "Guardado"}
        </p>
        <p className="text-gray-400 text-sm font-medium mt-1">{locNombre} · {formData.fecha}</p>
      </div>
      <button
        onClick={resetForm}
        className="mt-4 bg-indigo-600 text-white font-black px-10 py-4 rounded-2xl shadow-lg shadow-indigo-200 active:scale-95 transition-transform text-sm uppercase tracking-widest"
      >
        Reportar otra jornada
      </button>
    </div>
  );

  return (
    <div className="flex flex-col h-full max-w-md mx-auto px-6 select-none relative overflow-x-hidden">

      {/* ── Progress bar ── */}
      <div className="flex gap-1.5 px-1 mb-4 mt-1 shrink-0">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full flex-1 transition-all duration-500 ${
              i + 1 <= step ? "bg-indigo-500" : "bg-gray-200"
            }`}
          />
        ))}
      </div>

      {/* ── Step content ── */}
      <div className={`flex-1 flex flex-col min-h-0 transition-all duration-200 ease-out ${slideClass}`}>

        {/* ══ STEP 1: Fecha + Plaza ══ */}
        {step === 1 && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto pt-1 pb-4 space-y-6 scrollbar-hide">
              <div className="text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-1">Paso 1 de 4</p>
                <h2 className="text-2xl font-black text-gray-900 leading-tight">Configuración inicial</h2>
                <p className="text-sm text-gray-400 font-medium mt-1">Selecciona la fecha y ubicación</p>
              </div>

              <div className="grid gap-6">
                {/* Fecha */}
                <div className="group transition-all">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Fecha de la jornada</label>
                  <input
                    type="date"
                    value={formData.fecha}
                    onChange={e => setFormData({ ...formData, fecha: e.target.value })}
                    className="w-full bg-white border-2 border-gray-100 rounded-3xl px-5 py-4 font-black text-gray-700 focus:outline-none focus:border-indigo-600 transition-all shadow-sm group-hover:shadow-md"
                  />
                </div>

                {/* Plaza */}
                <div className="group transition-all">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Plaza operativa</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <select
                        value={formData.locacionId}
                        onChange={e => setFormData({ ...formData, locacionId: e.target.value })}
                        className="w-full bg-white border-2 border-gray-100 rounded-3xl px-5 py-4 font-black text-gray-700 focus:outline-none focus:border-indigo-600 transition-all appearance-none shadow-sm group-hover:shadow-md"
                      >
                        {locaciones.length === 0 ? (
                          <option value="">Cargando plazas...</option>
                        ) : (
                          <>
                            <option value="">Seleccionar plaza...</option>
                            {locaciones.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}
                          </>
                        )}
                      </select>
                      <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-600">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {existingRegistro && (
                  <div className="bg-amber-50 border-2 border-amber-100 rounded-3xl p-4 flex items-start gap-3 animate-in zoom-in duration-300">
                    <svg className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest leading-none mb-1 text-left">Existe registro previo</p>
                      <p className="text-[11px] text-amber-600 font-medium text-left">Al guardar sobreescribirás los datos de {locNombre}.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 bg-white px-6 pb-2 pt-2 z-40 border-t border-gray-50">
              <div className="max-w-md mx-auto">
                <button
                  onClick={() => goTo(2)}
                  disabled={!step1Valid}
                  className="w-full bg-indigo-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-black py-4 rounded-2xl text-sm uppercase tracking-widest shadow-xl shadow-indigo-100 active:scale-95 transition-all"
                >
                  Continuar →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══ STEP 2: Reporte del día ══ */}
        {step === 2 && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto pt-1 pb-20 space-y-4 scrollbar-hide">
              <div className="text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-1">Paso 2 de 4</p>
                <h2 className="text-2xl font-black text-gray-900 leading-tight">Reporte del día</h2>
                <p className="text-sm text-gray-400 font-medium mt-1">{locNombre} · {formData.fecha}</p>
              </div>

              <div className="flex flex-col gap-3">
                {STATUS_OPTIONS.map(opt => {
                  const isSelected = formData.status === opt.value;
                  const showInput = isSelected && opt.value !== 'operativo';

                  return (
                    <div
                      key={opt.value}
                      onClick={() => {
                        if (formData.status !== opt.value) {
                          setFormData({ ...formData, status: opt.value, motivoInactividad: "" });
                        }
                      }}
                      className={`flex items-center gap-3 px-4 py-4 rounded-3xl border-2 transition-all cursor-pointer ${
                        isSelected
                          ? `${opt.bg} border-opacity-100 shadow-sm`
                          : "bg-white border-gray-100 opacity-60 hover:opacity-100"
                      }`}
                    >
                      <span className={`flex-shrink-0 ${isSelected ? opt.color : "text-gray-400"}`}>
                        <StatusIcon value={opt.value} />
                      </span>
                      
                      <span className={`font-black text-lg flex-shrink-0 ${isSelected ? opt.color : "text-gray-600"}`}>
                        {opt.label}
                      </span>
                      
                      {showInput ? (
                        <input
                          autoFocus
                          type="text"
                          placeholder="Descripción..."
                          value={formData.motivoInactividad}
                          onChange={e => setFormData({ ...formData, motivoInactividad: e.target.value })}
                          onClick={e => e.stopPropagation()}
                          className={`flex-1 min-w-0 bg-transparent border-none p-0 font-black text-lg outline-none placeholder:text-gray-400/50 caret-indigo-600 ${opt.color}`}
                        />
                      ) : (
                        <div className="flex-1" />
                      )}

                      {isSelected && (
                        <span className="flex-shrink-0 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center shadow-sm">
                          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 bg-white px-6 pb-2 pt-2 z-40 border-t border-gray-50">
              <div className="max-w-md mx-auto flex gap-3">
                <button onClick={() => goTo(1)} className="flex-1 bg-gray-100 text-gray-600 font-black py-4 rounded-2xl text-sm uppercase tracking-widest active:scale-95 transition-all">
                  ← Atrás
                </button>
                <button
                  onClick={() => goTo(3)}
                  disabled={!step2Valid}
                  className="flex-[2] bg-indigo-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-black py-4 rounded-2xl text-sm uppercase tracking-widest shadow-xl shadow-indigo-100 active:scale-95 transition-all"
                >
                  Continuar →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══ STEP 3: Datos de la jornada ══ */}
        {step === 3 && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto pt-1 pb-32 space-y-4 scrollbar-hide">
              <div className="text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-1">Paso 3 de 4</p>
                <h2 className="text-2xl font-black text-gray-900 leading-tight">Datos de la jornada</h2>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <span className={statusInfo.color}><StatusIcon value={formData.status} /></span>
                  <p className="text-sm text-gray-400 font-medium">{statusInfo.label} · {locNombre}</p>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                {/* Tickets */}
                <div className="group transition-all">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Tickets vendidos</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={formData.tickets || ""}
                    onChange={e => setFormData({ ...formData, tickets: Number(e.target.value.replace(/\D/g, "")) })}
                    className="w-full bg-white border-2 border-gray-100 rounded-3xl px-5 py-4 text-4xl font-black text-gray-900 focus:outline-none focus:border-indigo-600 transition-all text-center tabular-nums shadow-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Precio Ticket */}
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Precio ticket</label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={formData.precioTicket}
                        onChange={e => {
                          let val = e.target.value.replace(/[^0-9.]/g, "");
                          const parts = val.split(".");
                          if (parts.length > 2) val = parts[0] + "." + parts.slice(1).join("");
                          setFormData({ ...formData, precioTicket: val });
                        }}
                        className="w-full bg-white border-2 border-gray-100 rounded-3xl pl-5 pr-8 py-4 text-xl font-black text-gray-900 focus:outline-none focus:border-indigo-600 transition-all text-right tabular-nums shadow-sm"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-lg font-black text-gray-400">$</span>
                    </div>
                  </div>

                  {/* Tasa BCV */}
                  <div>
                    <div className="flex items-center justify-between mb-2 px-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Tasa BCV</label>
                      <button 
                        type="button" 
                        onClick={fetchTasaBCV} 
                        disabled={fetchingTasa}
                        className={`text-[9px] font-black uppercase tracking-wide flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all ${
                          fetchingTasa 
                            ? "bg-gray-100 text-gray-400" 
                            : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100 active:scale-95"
                        }`}
                      >
                        <svg className={`w-3 h-3 ${fetchingTasa ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        {fetchingTasa ? "Sincronizando..." : "Sync"}
                      </button>
                    </div>
                    <div className="bg-gray-50 border-2 border-gray-100 rounded-3xl px-5 py-4 text-xl font-black text-gray-700 text-right tabular-nums shadow-inner">
                      {formData.tasaDolar.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Preview Total */}
                {(formData.tickets > 0 && precioNeto > 0) && (
                  <div className="bg-indigo-600 rounded-3xl p-6 shadow-xl shadow-indigo-100 animate-in zoom-in duration-300">
                    <p className="text-indigo-200 text-[10px] font-black uppercase tracking-widest mb-2">Resumen parcial</p>
                    <p className="text-white text-4xl font-black tabular-nums">
                      {totalBs.toLocaleString('es-VE', { maximumFractionDigits: 0 })} <span className="text-indigo-300 text-xl font-medium">Bs.</span>
                    </p>
                    <p className="text-indigo-100 text-xl font-black tabular-nums mt-1 leading-none">
                      ${totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                )}

                {formData.status !== "operativo" && formData.motivoInactividad && (
                  <div className="bg-amber-50 border-2 border-amber-100 rounded-3xl p-4 flex gap-3 items-center">
                    <svg className="w-5 h-5 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-xs text-amber-800 font-bold leading-tight uppercase flex-1">
                      Reportando: {formData.motivoInactividad}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 bg-white px-6 pb-2 pt-2 z-40 border-t border-gray-50">
              <div className="max-w-md mx-auto flex gap-3">
                <button onClick={() => goTo(2)} className="flex-1 bg-gray-100 text-gray-600 font-black py-4 rounded-2xl text-sm uppercase tracking-widest active:scale-95 transition-all">
                  ← Atrás
                </button>
                <button
                  onClick={() => goTo(4)}
                  disabled={!step3Valid}
                  className="flex-[2] bg-indigo-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-black py-4 rounded-2xl text-sm uppercase tracking-widest shadow-xl shadow-indigo-100 active:scale-95 transition-all"
                >
                  Revisar →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══ STEP 4: Confirmación ══ */}
        {step === 4 && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto pt-1 pb-4 space-y-4 scrollbar-hide text-center">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-1">Paso 4 de 4</p>
                <h2 className="text-2xl font-black text-gray-900 leading-tight">Confirmar jornada</h2>
                <p className="text-sm text-gray-400 font-medium mt-1">Verifica los datos finales</p>
              </div>

              <div className="bg-white border-2 border-gray-100 rounded-[3rem] p-8 space-y-8 shadow-sm">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 shadow-inner">
                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 012-2h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Tickets</p>
                    <h3 className="text-5xl font-black text-gray-900 leading-none tabular-nums">{formData.tickets.toLocaleString('es-VE')}</h3>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-3xl p-5">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Total USD</p>
                    <p className="text-xl font-black text-indigo-600 tabular-nums">${totalUSD.toFixed(2)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-3xl p-5">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Total Bs</p>
                    <p className="text-xl font-black text-emerald-600 tabular-nums">{totalBs.toLocaleString('es-VE', { maximumFractionDigits: 0 })}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-50 flex items-center justify-between text-gray-400 text-[9px] font-black uppercase tracking-widest px-2">
                  <span>{locNombre}</span>
                  <span>{locNombre}</span>
                  <div className="flex items-center gap-1.5 text-indigo-600">
                    <StatusIcon value={formData.status} />
                    <span className="text-gray-400 capitalize">{statusInfo.label}</span>
                  </div>
                </div>
              </div>

              {message && (
                <p className="text-sm font-black text-red-600 animate-pulse">{message}</p>
              )}
            </div>

            <div className="fixed bottom-0 left-0 right-0 bg-white px-6 pb-2 pt-2 z-40 border-t border-gray-50">
              <div className="max-w-md mx-auto flex gap-3">
                <button onClick={() => goTo(3)} className="flex-1 bg-gray-100 text-gray-600 font-black py-4 rounded-2xl text-sm uppercase tracking-widest active:scale-95 transition-all">
                  ← Atrás
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className={`flex-[2] font-black py-4 rounded-2xl text-sm uppercase tracking-widest shadow-xl active:scale-95 transition-all text-white ${
                    existingRegistro ? "bg-amber-600 shadow-amber-100" : "bg-indigo-600 shadow-indigo-100"
                  } disabled:opacity-60`}
                >
                  {loading ? "Guardando..." : "Guardar jornada"}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
