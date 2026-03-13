"use client";

import { useState, useEffect, useRef } from "react";
import { Locacion, RegistroDiario, RegistroStatus } from "@/types";
import { registroService, locacionService } from "@/services/firestore";

const STATUS_OPTIONS: { value: RegistroStatus; label: string; emoji: string; color: string; bg: string }[] = [
  { value: "operativo", label: "Operativo",  emoji: "✅", color: "text-indigo-700", bg: "bg-indigo-50 border-indigo-200" },
  { value: "lluvia",    label: "Lluvia",     emoji: "🌧️", color: "text-blue-700",   bg: "bg-blue-50 border-blue-200" },
  { value: "otro",      label: "Otro...",    emoji: "⚠️", color: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
];

const TOTAL_STEPS = 4;

export default function RegistroForm() {
  const [locaciones, setLocaciones] = useState<Locacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingTasa, setFetchingTasa] = useState(false);
  const [message, setMessage] = useState("");
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [animating, setAnimating] = useState(false);
  const [isAddingLocacion, setIsAddingLocacion] = useState(false);
  const [newLocacionName, setNewLocacionName] = useState("");
  const [existingRegistro, setExistingRegistro] = useState<RegistroDiario | null>(null);
  const [saved, setSaved] = useState(false);

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
    fetchLocaciones();
    fetchTasaBCV();
  }, []);

  useEffect(() => {
    if (formData.fecha && formData.locacionId) checkExisting();
    else setExistingRegistro(null);
  }, [formData.fecha, formData.locacionId]);

  async function checkExisting() {
    const id = `${formData.fecha}_${formData.locacionId}`;
    const existing = await registroService.getRegistro(id);
    setExistingRegistro(existing);
  }

  async function fetchLocaciones() {
    const data = await locacionService.getLocaciones();
    setLocaciones(data);
    if (data.length > 0 && !formData.locacionId) {
      setFormData(prev => ({ ...prev, locacionId: data[0].id }));
    }
  }

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

  async function handleAddLocacion() {
    if (!newLocacionName.trim()) return;
    setLoading(true);
    try {
      const id = newLocacionName.toLowerCase().trim().replace(/\s+/g, '-');
      await locacionService.addLocacion({ id, nombre: newLocacionName.trim() });
      await fetchLocaciones();
      setFormData(prev => ({ ...prev, locacionId: id }));
      setNewLocacionName("");
      setIsAddingLocacion(false);
    } catch {}
    finally { setLoading(false); }
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
      setMessage("❌ Error al guardar el registro");
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
    ? direction === "forward"
      ? "opacity-0 translate-x-8"
      : "opacity-0 -translate-x-8"
    : "opacity-100 translate-x-0";

  // ─── SAVED screen ───
  if (saved) return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-140px)] gap-6 animate-in fade-in zoom-in duration-500">
      <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center text-5xl shadow-lg shadow-indigo-100">✅</div>
      <div className="text-center">
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
    <div className="flex flex-col h-[calc(100dvh-120px)] max-w-md mx-auto px-6 select-none relative overflow-x-hidden">

      {/* ── Progress bar ── */}
      <div className="flex gap-1.5 px-1 mb-6 mt-2 shrink-0">
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
            <div className="flex-1 overflow-y-auto pt-2 pb-6 space-y-8 scrollbar-hide">
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
                        <option value="">Seleccionar plaza...</option>
                        {locaciones.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}
                      </select>
                      <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-600">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAddingLocacion(v => !v)}
                      className={`w-14 h-14 rounded-2xl border-2 font-black text-xl transition-all flex items-center justify-center shrink-0 ${
                        isAddingLocacion ? "bg-red-50 border-red-200 text-red-500 rotate-45" : "bg-gray-50 border-gray-100 text-gray-500"
                      }`}
                    >+</button>
                  </div>

                  {isAddingLocacion && (
                    <div className="mt-2 flex gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                      <input
                        autoFocus
                        type="text"
                        placeholder="Nombre de la plaza..."
                        value={newLocacionName}
                        onChange={e => setNewLocacionName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddLocacion()}
                        className="flex-1 bg-indigo-50 border-2 border-indigo-100 rounded-2xl px-4 py-3 text-sm font-bold text-gray-800 outline-none focus:border-indigo-400"
                      />
                      <button
                        type="button"
                        onClick={handleAddLocacion}
                        disabled={!newLocacionName.trim()}
                        className="bg-indigo-600 text-white font-black text-xs px-4 rounded-xl disabled:opacity-40 transition-opacity"
                      >OK</button>
                    </div>
                  )}
                </div>

                {existingRegistro && (
                  <div className="bg-amber-50 border-2 border-amber-100 rounded-3xl p-4 animate-in zoom-in duration-300">
                    <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest leading-none mb-1">⚠️ Existe registro previo</p>
                    <p className="text-[11px] text-amber-600 font-medium">Al guardar sobreescribirás los datos de {locNombre}.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 pb-6 shrink-0">
              <button
                onClick={() => goTo(2)}
                disabled={!step1Valid}
                className="w-full bg-indigo-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-black py-4 rounded-2xl text-sm uppercase tracking-widest shadow-lg shadow-indigo-100 active:scale-95 transition-all"
              >
                Continuar →
              </button>
            </div>
          </div>
        )}

        {/* ══ STEP 2: Reporte del día ══ */}
        {step === 2 && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto pt-2 pb-6 space-y-6 scrollbar-hide">
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
                      <span className="text-2xl flex-shrink-0">{opt.emoji}</span>
                      
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

            <div className="pt-4 pb-6 shrink-0 flex gap-3">
              <button onClick={() => goTo(1)} className="flex-1 bg-gray-100 text-gray-600 font-black py-4 rounded-2xl text-sm uppercase tracking-widest active:scale-95 transition-all">
                ← Atrás
              </button>
              <button
                onClick={() => goTo(3)}
                disabled={!step2Valid}
                className="flex-[2] bg-indigo-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-black py-4 rounded-2xl text-sm uppercase tracking-widest shadow-lg shadow-indigo-100 active:scale-95 transition-all"
              >
                Continuar →
              </button>
            </div>
          </div>
        )}

        {/* ══ STEP 3: Datos de la jornada ══ */}
        {step === 3 && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto pt-2 pb-6 space-y-6 scrollbar-hide">
              <div className="text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-1">Paso 3 de 4</p>
                <h2 className="text-2xl font-black text-gray-900 leading-tight">Datos de la jornada</h2>
                <p className="text-sm text-gray-400 font-medium mt-1">{statusInfo.emoji} {statusInfo.label} · {locNombre}</p>
              </div>

              <div className="flex flex-col gap-6">
                {/* Tickets */}
                <div className="group transition-all">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Tickets vendidos</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={formData.tickets || ""}
                    onChange={e => setFormData({ ...formData, tickets: Number(e.target.value.replace(/\D/g, "")) })}
                    className="w-full bg-white border-2 border-gray-100 rounded-3xl px-5 py-5 text-4xl font-black text-gray-900 focus:outline-none focus:border-indigo-600 transition-all text-center tabular-nums shadow-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                        className="w-full bg-white border-2 border-gray-100 rounded-3xl pl-5 pr-10 py-5 text-xl font-black text-gray-900 focus:outline-none focus:border-indigo-600 transition-all text-right tabular-nums shadow-sm"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-black text-gray-400">$</span>
                    </div>
                  </div>

                  {/* Tasa BCV */}
                  <div>
                    <div className="flex items-center justify-between mb-2 px-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Tasa BCV</label>
                      <button type="button" onClick={fetchTasaBCV} className="text-[9px] font-black text-indigo-500 uppercase tracking-wide">
                        {fetchingTasa ? "..." : "↻ Sync"}
                      </button>
                    </div>
                    <div className="bg-gray-50 border-2 border-gray-100 rounded-3xl px-5 py-5 text-xl font-black text-gray-700 text-right tabular-nums shadow-inner">
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
                    <span className="text-xl">ℹ️</span>
                    <p className="text-xs text-amber-800 font-bold leading-tight uppercase flex-1">
                      Reportando: {formData.motivoInactividad}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 pb-6 shrink-0 flex gap-3">
              <button onClick={() => goTo(2)} className="flex-1 bg-gray-100 text-gray-600 font-black py-4 rounded-2xl text-sm uppercase tracking-widest active:scale-95 transition-all">
                ← Atrás
              </button>
              <button
                onClick={() => goTo(4)}
                disabled={!step3Valid}
                className="flex-[2] bg-indigo-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-black py-4 rounded-2xl text-sm uppercase tracking-widest shadow-lg shadow-indigo-100 active:scale-95 transition-all"
              >
                Revisar →
              </button>
            </div>
          </div>
        )}

        {/* ══ STEP 4: Confirmación ══ */}
        {step === 4 && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto pt-2 pb-6 space-y-6 scrollbar-hide text-center">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-1">Paso 4 de 4</p>
                <h2 className="text-2xl font-black text-gray-900 leading-tight">Confirmar jornada</h2>
                <p className="text-sm text-gray-400 font-medium mt-1">Verifica los datos finales</p>
              </div>

              <div className="bg-white border-2 border-gray-100 rounded-[3rem] p-8 space-y-8 shadow-sm">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center text-3xl shadow-inner">
                    🎫
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
                  <span className="flex items-center gap-1">
                    {statusInfo.emoji} {statusInfo.label}
                  </span>
                </div>
              </div>

              {message && (
                <p className="text-sm font-black text-red-600 animate-pulse">{message}</p>
              )}
            </div>

            <div className="pt-4 pb-6 shrink-0 flex gap-3">
              <button onClick={() => goTo(3)} className="flex-1 bg-gray-100 text-gray-600 font-black py-4 rounded-2xl text-sm uppercase tracking-widest active:scale-95 transition-all">
                ← Atrás
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className={`flex-[2] font-black py-4 rounded-2xl text-sm uppercase tracking-widest shadow-lg active:scale-95 transition-all text-white ${
                  existingRegistro ? "bg-amber-600 shadow-amber-100" : "bg-indigo-600 shadow-indigo-100"
                } disabled:opacity-60`}
              >
                {loading ? "Guardando..." : "Guardar jornada"}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
