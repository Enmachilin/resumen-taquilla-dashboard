import { useState, useEffect, useMemo } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell
} from "recharts";
import { locacionService, registroService } from "@/services/firestore";
import { Locacion, RegistroDiario } from "@/types";

const MONTHS = [
    "Ene", "Feb", "Mar", "Abr", "May", "Jun",
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
];

// Colores modernos para diferentes años
const YEAR_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function ComparativaView() {
    const [locaciones, setLocaciones] = useState<Locacion[]>([]);
    const [activeLocacion, setActiveLocacion] = useState<string>("");
    const [registros, setRegistros] = useState<RegistroDiario[]>([]);
    const [loading, setLoading] = useState(true);
    const [isMounted, setIsMounted] = useState(false);
    const [selectedBar, setSelectedBar] = useState<any>(null);

    useEffect(() => {
        setIsMounted(true);
        const loadLocaciones = async () => {
            try {
                const locs = await locacionService.getLocaciones();
                setLocaciones(locs);
                const savedLoc = localStorage.getItem("lastActiveLocacion");
                if (savedLoc && savedLoc !== "all") {
                    setActiveLocacion(savedLoc);
                } else if (locs.length > 0) {
                    setActiveLocacion(locs[0].id);
                }
            } catch (error) {
                console.error("Error cargando locaciones:", error);
            }
        };
        loadLocaciones();
    }, []);

    useEffect(() => {
        if (!isMounted || !activeLocacion) return;

        const fetchDatos = async () => {
            setLoading(true);
            try {
                const data = await registroService.getRegistrosByLocacion(activeLocacion);
                setRegistros(data.filter((r) => r.status === "operativo"));
            } catch (error) {
                console.error("Error cargando registros para comparativa:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDatos();
    }, [activeLocacion, isMounted]);

    const { chartData } = useMemo(() => {
        if (!registros.length) return { chartData: [] };

        const yearsSet = new Set<string>();
        registros.forEach((r) => {
            const [y] = r.fecha.split("-");
            yearsSet.add(y);
        });

        const years = Array.from(yearsSet).sort((a, b) => a.localeCompare(b));

        const dataByYear: Record<string, any> = {};
        years.forEach(y => {
            dataByYear[y] = { nameLabel: y, _sortKey: y, total_dolares: 0, total_tickets: 0, total_bs: 0, breakdown: [] };
        });

        registros.forEach((r) => {
            const [y, mStr] = r.fecha.split("-");
            const monthNum = parseInt(mStr);
            const monthName = MONTHS[monthNum - 1];

            if (!dataByYear[y]) return;

            const dolares = r.precioTicket ? r.tickets * r.precioTicket : (r.totalCalculado / (r.tasaDolar || 1));

            dataByYear[y].total_dolares += dolares;
            dataByYear[y].total_tickets += r.tickets || 0;
            dataByYear[y].total_bs += r.totalCalculado || 0;

            const existingMonth = dataByYear[y].breakdown.find((b: any) => b.name === monthName);
            if (existingMonth) {
                existingMonth.dolares += dolares;
                existingMonth.tickets += r.tickets || 0;
                existingMonth.bs += r.totalCalculado || 0;
            } else {
                dataByYear[y].breakdown.push({ name: monthName, dolares, tickets: r.tickets || 0, bs: r.totalCalculado || 0 });
            }
        });

        const chartData = Object.values(dataByYear).sort((a, b) => a._sortKey.localeCompare(b._sortKey));
        chartData.forEach(d => {
            d.breakdown.sort((a: any, b: any) => MONTHS.indexOf(a.name) - MONTHS.indexOf(b.name));
        });

        return { chartData };
    }, [registros]);

    // Seleccionar por defecto la última columna (datos más recientes)
    useEffect(() => {
        if (chartData.length > 0) {
            setSelectedBar(chartData[chartData.length - 1]);
        } else {
            setSelectedBar(null);
        }
    }, [chartData]);

    const formatYAxis = (tickItem: number) => {
        if (tickItem >= 1000) {
            return `$${(tickItem / 1000).toFixed(1)}k`;
        }
        return `$${tickItem.toFixed(0)}`;
    };

    if (!isMounted) return null;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">

            <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                    <svg width="200" height="200" viewBox="0 0 24 24" fill="currentColor" className="text-indigo-900"><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z" /></svg>
                </div>

                {/* Header Unificado: Título + Selector */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 relative z-10 border-b border-gray-50 pb-6">
                    <div>
                        <h2 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-1">
                            Análisis Interanual
                        </h2>
                        <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
                            Rendimiento por Año
                        </h3>
                    </div>

                    <div className="flex flex-col min-w-[220px]">
                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2 ml-1">
                            Seleccionar Plaza
                        </label>
                        <select
                            value={activeLocacion}
                            onChange={(e) => {
                                setActiveLocacion(e.target.value);
                                localStorage.setItem("lastActiveLocacion", e.target.value);
                            }}
                            className="bg-gray-50 border-2 border-gray-100 outline-none p-3 px-4 rounded-xl text-sm font-bold text-gray-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all cursor-pointer appearance-none shadow-sm"
                            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236366f1'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.2em' }}
                        >
                            {locaciones.map((l) => (
                                <option key={l.id} value={l.id}>{l.nombre}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 animate-pulse">
                        <div className="h-10 w-10 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
                        <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">Calculando datos históricos...</p>
                    </div>
                ) : chartData.length > 0 ? (
                    <>
                        <div className="h-80 w-full relative z-10 outline-none border-b border-gray-50">
                            <ResponsiveContainer width="100%" height="100%" style={{ outline: 'none' }}>
                                <BarChart
                                    data={chartData}
                                    margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
                                    style={{ outline: 'none' }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                    <XAxis
                                        dataKey="nameLabel"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#9ca3af', fontSize: 12, fontWeight: 800 }}
                                        dy={10}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#9ca3af', fontSize: 12, fontWeight: 800 }}
                                        tickFormatter={formatYAxis}
                                        dx={-10}
                                    />
                                    <Tooltip
                                        cursor={false}
                                        content={() => null}
                                    />
                                    <Bar
                                        dataKey="total_dolares"
                                        fill={YEAR_COLORS[0]}
                                        radius={[6, 6, 0, 0]}
                                        maxBarSize={60}
                                        animationDuration={1000}
                                        animationEasing="ease-in-out"
                                        cursor="pointer"
                                        onClick={(data) => setSelectedBar(data.payload || data)}
                                        activeBar={false}
                                        tabIndex={-1}
                                    >
                                        {chartData.map((entry: any, i: number) => {
                                            const isActive = selectedBar?.nameLabel === entry.nameLabel;
                                            return (
                                                <Cell
                                                    key={`cell-${i}`}
                                                    fill={YEAR_COLORS[i % YEAR_COLORS.length]}
                                                    opacity={isActive ? 1 : 0.15}
                                                    stroke={isActive ? "#4338ca" : "transparent"}
                                                    strokeWidth={isActive ? 3 : 0}
                                                    style={{ outline: "none", transition: "all 0.3s ease" }}
                                                />
                                            );
                                        })}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Tarjeta Persistente de Detalles (Mobile First) */}
                        {selectedBar && (
                            <div className="mt-8 bg-indigo-50 border-2 border-indigo-100 rounded-3xl p-6 relative overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                                <h4 className="text-indigo-900 font-black uppercase tracking-wider text-sm mb-4 flex items-center gap-2">
                                    <span className="bg-white p-1 rounded-md shadow-sm">📊</span>
                                    Detalles del Año {selectedBar.nameLabel}
                                </h4>

                                <div className="space-y-4">
                                    <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-indigo-100/50 pb-4 gap-4">
                                        <div className="flex flex-col">
                                            <span className="text-indigo-500 font-bold text-xs uppercase">Total Anual (USD)</span>
                                            <span className="text-3xl font-black text-indigo-700">
                                                ${selectedBar.total_dolares?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                                            </span>
                                        </div>
                                        <div className="flex gap-4">
                                            <div className="flex flex-col items-end">
                                                <span className="text-indigo-400 font-bold text-[10px] uppercase">Recaudado (Bs)</span>
                                                <span className="text-sm font-black text-indigo-600">Bs {selectedBar.total_bs?.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</span>
                                            </div>
                                            <div className="flex flex-col items-end border-l border-indigo-100 pl-4">
                                                <span className="text-indigo-400 font-bold text-[10px] uppercase">Tickets</span>
                                                <span className="text-sm font-black text-indigo-600">{selectedBar.total_tickets?.toLocaleString('es-VE') || 0} <span className="text-[10px]">u.</span></span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2 pt-2">
                                        {selectedBar.breakdown?.map((b: any, i: number) => (
                                            <div key={i} className="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm border border-indigo-50/50">
                                                <span className="text-indigo-900 text-xs w-[40px] uppercase font-black">{b.name}</span>
                                                <div className="flex gap-4 items-center">
                                                    <div className="hidden md:flex flex-col items-end min-w-[50px] md:min-w-[80px]">
                                                        <span className="text-[8px] text-gray-400 font-bold uppercase">Tickets</span>
                                                        <span className="font-bold text-gray-700 text-[10px] md:text-[11px]">{b.tickets.toLocaleString('es-VE')}</span>
                                                    </div>
                                                    <div className="flex flex-col items-end min-w-[70px] md:min-w-[100px] md:border-l md:border-gray-100 md:pl-4">
                                                        <span className="text-[8px] text-gray-400 font-bold uppercase">Bs</span>
                                                        <span className="font-bold text-gray-700 text-[10px] md:text-[11px]">Bs {b.bs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                    </div>
                                                    <div className="flex flex-col items-end min-w-[70px] md:min-w-[80px] border-l border-indigo-50 pl-2 md:pl-4 bg-indigo-50/30 rounded-r-md px-2 -py-1">
                                                        <span className="text-[8px] text-indigo-500 font-bold uppercase">USD</span>
                                                        <span className="font-black text-indigo-700 text-xs md:text-sm">${b.dolares.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center py-20 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-200">
                        <div className="text-4xl mb-4">📈</div>
                        <p className="text-gray-500 font-bold px-10">No hay datos históricos comparables para esta plaza.</p>
                        <p className="text-gray-400 text-sm mt-2">La gráfica se construirá automáticamente al tener registros de distintos meses/años.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
