"use client";

import { useState, useEffect } from "react";
import { Locacion, RegistroDiario, RegistroStatus } from "@/types";
import { registroService, locacionService } from "@/services/firestore";

export default function RegistroForm() {
  const [locaciones, setLocaciones] = useState<Locacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [fetchingTasa, setFetchingTasa] = useState(false);
  const [isAddingLocacion, setIsAddingLocacion] = useState(false);
  const [newLocacionName, setNewLocacionName] = useState("");

  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split("T")[0],
    locacionId: "",
    tickets: 0,
    precioTicket: "1$", // Precio por defecto como string para el UI
    tasaDolar: 36.5,
    status: "operativo" as RegistroStatus,
    motivoInactividad: "",
    comentarios: "",
  });

  useEffect(() => {
    fetchLocaciones();
    fetchTasaBCV();
  }, []);

  async function fetchLocaciones() {
    const data = await locacionService.getLocaciones();
    setLocaciones(data);
  }

  async function fetchTasaBCV() {
    setFetchingTasa(true);
    try {
      const response = await fetch("https://ve.dolarapi.com/v1/dolares/oficial");
      const data = await response.json();
      if (data && data.promedio) {
        const rounded = Math.round(data.promedio * 100) / 100;
        setFormData(prev => ({ ...prev, tasaDolar: rounded }));
      }
    } catch (error) {
      console.error("Error fetching BCV rate:", error);
    } finally {
      setFetchingTasa(false);
    }
  }

  const handleAddLocacion = async () => {
    if (!newLocacionName.trim()) return;
    
    setLoading(true);
    try {
      const id = newLocacionName.toLowerCase().trim().replace(/\s+/g, '-');
      await locacionService.addLocacion({ id, nombre: newLocacionName.trim() });
      await fetchLocaciones();
      setFormData(prev => ({ ...prev, locacionId: id }));
      setNewLocacionName("");
      setIsAddingLocacion(false);
      setMessage("✅ Locación agregada");
    } catch (error) {
      console.error(error);
      setMessage("❌ Error al agregar locación");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const id = `${formData.fecha}_${formData.locacionId}`;
      const precioNeto = parseFloat(formData.precioTicket.replace(/[^0-9.]/g, "")) || 0;
      const totalCalculado = formData.status === "operativo" ? formData.tickets * precioNeto * formData.tasaDolar : 0;

      await registroService.saveRegistro({
        ...formData,
        id,
        tickets: formData.status === "operativo" ? Number(formData.tickets) : 0,
        precioTicket: Number(precioNeto),
        tasaDolar: Number(formData.tasaDolar.toFixed(2)),
        totalCalculado: Number(totalCalculado.toFixed(2)),
      });

      setMessage("✅ Registro guardado con éxito");
      // Opcional: limpiar campos tras guardar
      if (formData.status === "operativo") {
        setFormData(prev => ({ ...prev, tickets: 0 }));
      }
    } catch (error) {
      console.error(error);
      setMessage("❌ Error al guardar el registro");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-xl shadow-lg border border-gray-100">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Cargar Jornada</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Fecha</label>
          <input
            type="date"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border text-black"
            value={formData.fecha}
            onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 font-bold">Locación / Plaza</label>
              <select
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border text-black font-semibold"
                value={formData.locacionId}
                onChange={(e) => setFormData({ ...formData, locacionId: e.target.value })}
              >
                <option value="">Seleccione...</option>
                {locaciones.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.nombre}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => setIsAddingLocacion(!isAddingLocacion)}
              className={`mb-[2px] p-2.5 rounded-md transition-all border ${
                isAddingLocacion 
                  ? "bg-red-50 text-red-600 border-red-200 rotate-45" 
                  : "bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200"
              }`}
              title={isAddingLocacion ? "Cancelar" : "Agregar nueva locación"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
          </div>

          {isAddingLocacion && (
            <div className="flex gap-2 animate-in fade-in slide-in-from-top-2 duration-200 bg-indigo-50 p-3 rounded-lg border border-indigo-100">
              <input
                type="text"
                autoFocus
                placeholder="Nombre de nueva plaza..."
                className="flex-1 p-2 border rounded-md text-sm text-black"
                value={newLocacionName}
                onChange={(e) => setNewLocacionName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddLocacion();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddLocacion}
                disabled={!newLocacionName.trim()}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md font-bold text-xs disabled:opacity-50"
              >
                AÑADIR
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Estado de la Plaza</label>
          <div className="flex flex-wrap gap-2 mt-2">
            {(["operativo", "lluvia", "mudanza", "libre", "otro"] as RegistroStatus[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setFormData({ ...formData, status: s })}
                className={`px-4 py-2 rounded-full text-xs font-bold capitalize transition-colors border ${
                  formData.status === s
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {formData.status === "operativo" ? (
          <>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700">Tickets Vendidos</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border text-black text-lg font-bold"
                  value={formData.tickets || ""}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setFormData({ ...formData, tickets: Number(val) });
                  }}
                  placeholder="0"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700">Precio Ticket</label>
                <div className="relative mt-1 border border-gray-300 rounded-md shadow-sm focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 overflow-hidden bg-white">
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    className="block w-full border-0 p-2 text-black text-lg font-bold pr-8 text-right bg-transparent focus:ring-0"
                    value={formData.precioTicket.replace("$", "")}
                    onChange={(e) => {
                      let val = e.target.value.replace(/[^0-9.]/g, "");
                      // Prevenir multiples puntos decimales
                      const parts = val.split(".");
                      if (parts.length > 2) val = parts[0] + "." + parts.slice(1).join("");
                      setFormData({ ...formData, precioTicket: val ? `${val}$` : "" });
                    }}
                    onBlur={() => {
                      if (formData.precioTicket && !formData.precioTicket.endsWith("$")) {
                        setFormData({ ...formData, precioTicket: `${formData.precioTicket}$` });
                      } else if (!formData.precioTicket) {
                        setFormData({ ...formData, precioTicket: "1$" });
                      }
                    }}
                    placeholder="1"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-lg font-bold">$</span>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">Tasa Dólar (BCV)</label>
                <button 
                  type="button" 
                  onClick={fetchTasaBCV}
                  className="text-[10px] text-indigo-600 font-bold hover:underline"
                >
                  {fetchingTasa ? "Actualizando..." : "Actualizar Tasa"}
                </button>
              </div>
              <div className="mt-1 block w-full rounded-md border-gray-100 bg-gray-50 p-2.5 border text-black font-semibold">
                {formData.tasaDolar.toFixed(2)} <span className="text-[10px] text-gray-400 font-bold ml-1">Bs/USD</span>
              </div>
            </div>

            <div className="p-4 bg-indigo-50 border-2 border-indigo-100 rounded-xl">
              <span className="text-[10px] text-indigo-400 font-black uppercase tracking-widest block mb-1">Total Est. a Reportar</span>
              <div className="flex justify-between items-end mt-1">
                <div className="text-2xl font-black text-indigo-900">
                  {(formData.tickets * (parseFloat(formData.precioTicket.replace(/[^0-9.]/g, "")) || 0) * formData.tasaDolar).toLocaleString('es-VE', { minimumFractionDigits: 2 })} <span className="text-base text-indigo-700/80">Bs.</span>
                </div>
                <div className="text-xl font-bold text-indigo-700 bg-indigo-100/50 px-3 py-1 rounded-lg">
                  <span className="text-sm mr-0.5">$</span>{(formData.tickets * (parseFloat(formData.precioTicket.replace(/[^0-9.]/g, "")) || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700">Motivo de Inactividad</label>
            <textarea
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border text-black"
              rows={3}
              value={formData.motivoInactividad}
              onChange={(e) => setFormData({ ...formData, motivoInactividad: e.target.value })}
              placeholder="Ej: Lluvia intensa impidió la operación..."
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 italic">Comentarios internos (Opcional)</label>
          <textarea
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border text-black"
            rows={2}
            value={formData.comentarios}
            onChange={(e) => setFormData({ ...formData, comentarios: e.target.value })}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !formData.locacionId}
          className="w-full bg-indigo-600 text-white font-black py-4 px-4 rounded-xl hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-100 disabled:opacity-50 mt-4"
        >
          {loading ? "PROCESANDO..." : "GUARDAR JORNADA"}
        </button>

        {message && (
          <div className={`p-3 rounded-lg text-center text-sm font-bold ${message.includes("✅") ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-700 border border-red-100"}`}>
            {message}
          </div>
        )}
      </form>
    </div>
  );
}
