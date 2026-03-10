"use client";

import { useState, useEffect } from "react";
import { Locacion, RegistroDiario } from "@/types";
import { registroService, locacionService } from "@/services/firestore";

export default function RegistrosView() {
    const [locaciones, setLocaciones] = useState<Locacion[]>([]);
    const [selectedLocacion, setSelectedLocacion] = useState("");
    const [registros, setRegistros] = useState<RegistroDiario[]>([]);
    const [loading, setLoading] = useState(false);
    const [availableYears, setAvailableYears] = useState<string[]>([]);
    const [selectedYear, setSelectedYear] = useState("");

    useEffect(() => {
        fetchLocaciones();
    }, []);

    useEffect(() => {
        if (selectedLocacion) {
            fetchRegistros();
        } else {
            setRegistros([]);
            setAvailableYears([]);
            setSelectedYear("");
        }
    }, [selectedLocacion]);

    async function fetchLocaciones() {
        const data = await locacionService.getLocaciones();
        setLocaciones(data);
    }

    async function fetchRegistros() {
        setLoading(true);
        try {
            const data = await registroService.getRegistrosByLocacion(selectedLocacion);

            // Get unique years
            const years = Array.from(new Set(data.map(r => r.fecha.split("-")[0]))).sort((a, b) => b.localeCompare(a));
            setAvailableYears(years);

            if (years.length > 0) {
                if (!selectedYear || !years.includes(selectedYear)) {
                    setSelectedYear(years[0]);
                }
            } else {
                setSelectedYear("");
            }

            setRegistros(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    const filteredRegistros = registros.filter(r => r.fecha.startsWith(selectedYear));

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Selectores */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-50 flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full text-black">
                    <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Seleccionar Plaza</label>
                    <select
                        className="w-full bg-indigo-50/50 border-2 border-indigo-100 rounded-xl p-3 text-indigo-900 font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        value={selectedLocacion}
                        onChange={(e) => setSelectedLocacion(e.target.value)}
                    >
                        <option value="">Seleccione una plaza...</option>
                        {locaciones.map(loc => (
                            <option key={loc.id} value={loc.id}>{loc.nombre}</option>
                        ))}
                    </select>
                </div>

                {availableYears.length > 0 && (
                    <div className="w-full md:w-40 text-black">
                        <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Consultar Año</label>
                        <select
                            className="w-full bg-indigo-50/50 border-2 border-indigo-100 rounded-xl p-3 text-indigo-900 font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-center"
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                        >
                            {availableYears.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            ) : selectedLocacion ? (
                <div className="space-y-3">
                    <div className="flex justify-between items-center px-2">
                        <h3 className="text-sm font-black text-indigo-900 uppercase">
                            Registros {selectedYear}
                            <span className="ml-2 bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full text-[10px]">
                                {filteredRegistros.length} días
                            </span>
                        </h3>
                    </div>

                    <div className="grid gap-3">
                        {filteredRegistros.length > 0 ? (
                            filteredRegistros.map((r) => (
                                <div key={r.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center hover:shadow-md transition-shadow">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">{r.fecha}</span>
                                        <span className={`text-[10px] font-bold uppercase mt-0.5 px-2 py-0.5 rounded-md inline-block w-fit ${r.status === 'operativo' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'
                                            }`}>
                                            {r.status}
                                        </span>
                                    </div>

                                    {r.status === 'operativo' ? (
                                        <div className="flex gap-4 items-center">
                                            <div className="hidden sm:flex flex-col items-end">
                                                <span className="text-xs font-bold text-gray-900">{r.tickets} <span className="text-[10px] font-normal text-gray-400">tickets</span></span>
                                                <span className="text-[9px] text-gray-400 font-bold">${r.precioTicket} c/u</span>
                                            </div>
                                            <div className="bg-indigo-50/50 p-2 rounded-lg text-right min-w-[110px] border border-indigo-100/50">
                                                <span className="block text-xs font-black text-indigo-900">
                                                    {r.totalCalculado.toLocaleString('es-VE')} <span className="text-[8px]">Bs</span>
                                                </span>
                                                <div className="flex items-center justify-end gap-1 opacity-70">
                                                    <span className="text-[10px] font-bold text-indigo-600">${(r.tickets * (r.precioTicket || 1)).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex-1 ml-4 text-right">
                                            <span className="text-[11px] italic text-gray-400 line-clamp-1">
                                                {r.motivoInactividad}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-gray-100 text-gray-400">
                                No hay registros para este año
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                    <div className="text-5xl mb-4 grayscale opacity-20">📂</div>
                    <p className="text-gray-400 font-bold">Selecciona una plaza para ver su historial</p>
                    <p className="text-[10px] text-gray-300 uppercase tracking-widest mt-2">Consulta de registros diarios</p>
                </div>
            )}
        </div>
    );
}
