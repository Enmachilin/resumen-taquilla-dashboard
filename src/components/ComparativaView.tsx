import { useState, useEffect, useMemo } from "react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
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
    const [selectedYear, setSelectedYear] = useState<string | null>(null);
    const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

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
                setRegistros(data);
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

            const isActuallyOperative = r.status === 'operativo' || (r.tickets > 0);
            const dolares = isActuallyOperative
                ? (r.precioTicket ? r.tickets * r.precioTicket : (r.totalCalculado / (r.tasaDolar || 1)))
                : 0;

            if (isActuallyOperative) {
                dataByYear[y].total_dolares += dolares;
                dataByYear[y].total_tickets += r.tickets || 0;
                dataByYear[y].total_bs += r.totalCalculado || 0;
            }

            const dayRecord = {
                fecha: r.fecha,
                tickets: r.tickets || 0,
                dolares,
                bs: r.totalCalculado || 0,
                precioTicket: r.precioTicket,
                tasaDolar: r.tasaDolar,
                status: r.status,
                motivoInactividad: r.motivoInactividad,
                comentarios: r.comentarios,
            };

            const existingMonth = dataByYear[y].breakdown.find((b: any) => b.name === monthName);
            if (existingMonth) {
                if (isActuallyOperative) {
                    existingMonth.dolares += dolares;
                    existingMonth.tickets += r.tickets || 0;
                    existingMonth.bs += r.totalCalculado || 0;
                }
                existingMonth.days.push(dayRecord);
            } else {
                dataByYear[y].breakdown.push({ 
                    name: monthName, 
                    monthNum, 
                    dolares: isActuallyOperative ? dolares : 0, 
                    tickets: isActuallyOperative ? r.tickets || 0 : 0, 
                    bs: isActuallyOperative ? r.totalCalculado || 0 : 0, 
                    days: [dayRecord] 
                });
            }
        });

        const chartData = Object.values(dataByYear).sort((a, b) => a._sortKey.localeCompare(b._sortKey));
        chartData.forEach(d => {
            d.breakdown.sort((a: any, b: any) => MONTHS.indexOf(a.name) - MONTHS.indexOf(b.name));
        });

        return { chartData };
    }, [registros]);

    // Seleccionar por defecto el año más reciente disponible
    useEffect(() => {
        if (chartData.length > 0) {
            const latestYear = chartData[chartData.length - 1].nameLabel;
            // Si el año seleccionado no existe en los datos, resetear al más reciente
            const exists = chartData.some((d: any) => d.nameLabel === selectedYear);
            if (!exists) {
                setSelectedYear(latestYear);
            }
        } else {
            setSelectedYear(null);
        }
    }, [chartData]);

    // Sincronizar selectedBar con selectedYear
    useEffect(() => {
        if (!selectedYear || !chartData.length) { setSelectedBar(null); return; }
        const found = chartData.find((d: any) => d.nameLabel === selectedYear);
        setSelectedBar(found || null);
        setExpandedMonth(null); // colapsar acordeones al cambiar año
    }, [selectedYear, chartData]);

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
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-4 relative z-10 border-b border-gray-50 pb-0">
                    <div>
                        <h2 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-1">
                            Análisis Interanual
                        </h2>
                        <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
                            Rendimiento por Año
                        </h3>
                    </div>

                    <div className="flex flex-col min-w-[220px]">
                        <label className="text-xs md:text-sm font-black uppercase text-gray-400 tracking-wider mb-2 text-center">
                            Seleccionar Plaza
                        </label>
                        <select
                            value={activeLocacion}
                            onChange={(e) => {
                                setActiveLocacion(e.target.value);
                                localStorage.setItem("lastActiveLocacion", e.target.value);
                            }}
                            className="bg-gray-50 border-2 border-gray-100 outline-none p-4 px-6 rounded-xl text-lg md:text-xl font-black text-gray-800 text-center focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all cursor-pointer appearance-none shadow-sm"
                            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236366f1'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.5em' }}
                        >
                            {locaciones.map((l) => (
                                <option key={l.id} value={l.id}>{l.nombre}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Selector de Año - pills entre plaza y resumen */}
                {!loading && chartData.length > 1 && (
                    <div className="mb-3">
                        <div className={`flex flex-nowrap gap-2 justify-end px-0.5 py-2 ${chartData.length > 4 ? 'overflow-x-auto' : 'overflow-visible'}`}>
                            {chartData.map((d: any) => (
                                <button
                                    key={d.nameLabel}
                                    onClick={() => setSelectedYear(d.nameLabel)}
                                    className={`flex-shrink-0 px-5 py-2 rounded-full text-sm font-black tracking-wide transition-all duration-200 ${
                                        selectedYear === d.nameLabel
                                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                                            : 'bg-gray-100 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600'
                                    }`}
                                >
                                    {d.nameLabel}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 animate-pulse">
                        <div className="h-10 w-10 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
                        <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">Calculando datos históricos...</p>
                    </div>
                ) : chartData.length > 0 ? (
                    <>
                        {/* Tarjeta Persistente de Detalles (Simetría y Tamaño Máximo) */}
                        {selectedBar && (
                            <div className="mb-8 bg-indigo-50 border-2 border-indigo-100 rounded-3xl p-3 md:p-10 relative overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                                <h4 className="text-indigo-900 font-black uppercase tracking-widest text-sm md:text-lg mb-6 flex items-center justify-center gap-2 opacity-60">
                                    <span className="bg-white p-1 rounded-md shadow-sm">📊</span>
                                    RESUMEN ANUAL {selectedBar.nameLabel}
                                </h4>

                                <div className="grid grid-cols-3 gap-1.5 md:gap-6 text-center pb-6 border-b border-indigo-200/50">
                                    {/* Métrica 1: Tickets */}
                                    <div className="flex flex-col items-center justify-center p-2 md:p-4 bg-white/40 rounded-xl md:rounded-2xl border border-white/50 shadow-sm min-w-0 overflow-hidden">
                                        <span className="font-black text-xs md:text-base uppercase tracking-tighter text-indigo-500 mb-1">Tickets</span>
                                        <span className="text-2xl sm:text-3xl md:text-5xl font-black text-indigo-700 tabular-nums leading-none">
                                            {selectedBar.total_tickets?.toLocaleString('es-VE') || 0}
                                        </span>
                                    </div>

                                    {/* Métrica 2: Total USD */}
                                    <div className="flex flex-col items-center justify-center p-2 md:p-4 bg-indigo-600 rounded-xl md:rounded-2xl shadow-lg shadow-indigo-200 border border-indigo-400 min-w-0 overflow-hidden">
                                        <span className="font-black text-xs md:text-base uppercase tracking-widest text-indigo-200">USD</span>
                                        <span className="text-2xl sm:text-3xl md:text-5xl font-black text-white tabular-nums leading-none">
                                            ${selectedBar.total_dolares?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '0'}
                                        </span>
                                    </div>

                                    {/* Métrica 3: Bolívares */}
                                    <div className="flex flex-col items-center justify-center p-2 md:p-4 bg-white/40 rounded-xl md:rounded-2xl border border-white/50 shadow-sm min-w-0 overflow-hidden">
                                        <span className="font-black text-xs md:text-base uppercase tracking-tighter text-indigo-500 mb-1">Bs.</span>
                                        <span className="text-xl sm:text-2xl md:text-4xl font-black text-indigo-700 tabular-nums leading-none">
                                            {selectedBar.total_bs?.toLocaleString('es-VE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '0'}
                                        </span>
                                    </div>
                                </div>

                                {/* Desglose Mensual - Optimizado para ancho máximo */}
                                <div className="mt-8 space-y-2">
                                    <h5 className="text-sm md:text-lg font-black text-indigo-300 uppercase tracking-widest text-center mb-4">Detalle Mensual</h5>
                                    <div className="grid grid-cols-1 gap-2">
                                        {selectedBar.breakdown?.map((b: any, i: number) => {
                                            const monthKey = `${selectedBar.nameLabel}-${b.name}`;
                                            const isExpanded = expandedMonth === monthKey;
                                            const sortedDays = b.days?.slice().sort((a: any, b: any) => a.fecha.localeCompare(b.fecha)) || [];
                                            return (
                                            <div key={i} className="rounded-2xl md:rounded-[2rem] overflow-hidden">
                                                {/* Header del mes - clickeable */}
                                                <div
                                                    onClick={() => setExpandedMonth(isExpanded ? null : monthKey)}
                                                    className={`group flex items-center bg-white p-3 md:p-6 shadow-sm border cursor-pointer transition-all ${
                                                        isExpanded ? 'border-indigo-300 rounded-t-2xl md:rounded-t-[2rem] rounded-b-none' : 'border-transparent hover:border-indigo-300 rounded-2xl md:rounded-[2rem]'
                                                    }`}
                                                >
                                                    <div className="flex-shrink-0 mr-3 md:mr-8">
                                                        <span className={`text-sm md:text-3xl uppercase font-black w-10 h-10 md:w-20 md:h-20 flex items-center justify-center rounded-xl md:rounded-3xl border transition-colors capitalize ${
                                                            isExpanded ? 'bg-indigo-600 text-white border-indigo-500' : 'text-indigo-900 bg-indigo-50 border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white'
                                                        }`}>{b.name.slice(0, 3)}</span>
                                                    </div>

                                                    <div className="grid grid-cols-3 gap-3 md:gap-16 items-center flex-1 min-w-0">
                                                        <div className="flex flex-col items-start min-w-0">
                                                            <span className="text-[10px] md:text-sm font-bold text-gray-400 uppercase leading-none mb-1">Tickets</span>
                                                            <span className="text-base md:text-3xl font-black text-gray-800 tabular-nums leading-none tracking-tighter">{b.tickets.toLocaleString('es-VE')}</span>
                                                        </div>

                                                        <div className="flex flex-col items-start border-l border-gray-100 pl-3 md:pl-8 min-w-0">
                                                            <span className="text-[10px] md:text-sm font-black text-indigo-500 uppercase leading-none mb-1">USD</span>
                                                            <span className="text-base md:text-3xl font-black text-indigo-600 tabular-nums leading-none">${b.dolares.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                                                        </div>

                                                        <div className="flex flex-col items-end text-right bg-indigo-50/50 rounded-lg p-2 md:p-5 min-w-0">
                                                            <span className="text-[10px] md:text-sm font-bold text-gray-400 uppercase leading-none mb-1">Bs.</span>
                                                            <span className="text-sm md:text-2xl font-black text-gray-700 tabular-nums leading-none">{b.bs.toLocaleString('es-VE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                                                        </div>
                                                    </div>

                                                    {/* Indicador de acordeón */}
                                                    <div className="flex-shrink-0 ml-2 md:ml-4">
                                                        <svg className={`w-4 h-4 md:w-6 md:h-6 text-indigo-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </div>
                                                </div>

                                                {/* Contenido expandible - días */}
                                                {isExpanded && (
                                                    <div className="bg-gray-50 border-x border-b border-indigo-200 rounded-b-2xl md:rounded-b-[2rem] p-2 md:p-4 space-y-1 md:space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                                        <div className="grid grid-cols-4 gap-2 px-2 md:px-4 py-1 text-[9px] md:text-xs font-bold text-gray-400 uppercase tracking-wider">
                                                            <span>Fecha</span>
                                                            <span className="text-center">Tickets</span>
                                                            <span className="text-center">USD</span>
                                                            <span className="text-right">Bs.</span>
                                                        </div>
                                                        {sortedDays.map((day: any, di: number) => {
                                                            const [, , dd] = day.fecha.split('-');
                                                            const dayNum = parseInt(dd);
                                                            const isActuallyOperative = (day.tickets > 0) || day.status === 'operativo';

                                                            // Mapeo de status a etiqueta y color
                                                            const statusMap: Record<string, { label: string; bg: string; text: string; badge: string }> = {
                                                                lluvia:   { label: 'Lluvia',   bg: 'bg-blue-50',   text: 'text-blue-700',  badge: 'bg-blue-100 text-blue-600' },
                                                                mudanza:  { label: 'Mudanza',  bg: 'bg-amber-50',  text: 'text-amber-700', badge: 'bg-amber-100 text-amber-600' },
                                                                libre:    { label: 'Libre',    bg: 'bg-gray-50',   text: 'text-gray-600',  badge: 'bg-gray-100 text-gray-500' },
                                                                otro:     { label: 'Otro',     bg: 'bg-orange-50', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-600' },
                                                            };
                                                            const st = statusMap[day.status as keyof typeof statusMap] ?? { label: day.status, bg: 'bg-gray-50', text: 'text-gray-600', badge: 'bg-gray-100 text-gray-500' };

                                                            if (!isActuallyOperative) return (
                                                                <div key={di} className={`flex items-center gap-3 ${st.bg} rounded-xl md:rounded-2xl px-3 md:px-6 py-2.5 md:py-4 border border-dashed border-gray-200/80`}>
                                                                    <span className={`flex-shrink-0 text-xs md:text-sm font-black w-7 h-7 md:w-10 md:h-10 flex items-center justify-center rounded-lg md:rounded-xl ${st.badge}`}>
                                                                        {dayNum}
                                                                    </span>
                                                                    <span className={`text-xs md:text-sm font-black uppercase tracking-wide ${st.text}`}>{st.label}</span>
                                                                    {(day.motivoInactividad || day.comentarios) && (
                                                                        <span className="text-[10px] md:text-xs text-gray-400 font-medium">— {day.motivoInactividad || day.comentarios}</span>
                                                                    )}
                                                                    <span className={`ml-auto text-[10px] font-black uppercase tracking-widest ${st.text} opacity-60`}>Sin operación</span>
                                                                </div>
                                                            );

                                                            return (
                                                                <div key={di} className={`grid grid-cols-4 gap-2 ${day.status !== 'operativo' ? st.bg : 'bg-white'} rounded-xl md:rounded-2xl px-3 md:px-6 py-2.5 md:py-4 border ${day.status !== 'operativo' ? 'border-dashed border-indigo-200' : 'border-gray-100'} hover:border-indigo-300 transition-colors relative overflow-hidden group/day`}>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={`text-xs md:text-lg font-black ${day.status !== 'operativo' ? st.text + ' ' + st.badge : 'text-indigo-500 bg-indigo-50'} w-7 h-7 md:w-10 md:h-10 flex items-center justify-center rounded-lg md:rounded-xl`}>{dayNum}</span>
                                                                        {day.status !== 'operativo' && (
                                                                            <span className={`hidden md:block text-[9px] font-black uppercase tracking-tighter ${st.text} opacity-70`}>{st.label}</span>
                                                                        )}
                                                                    </div>
                                                                    <span className="text-sm md:text-xl font-black text-gray-800 tabular-nums flex items-center justify-center">{day.tickets.toLocaleString('es-VE')}</span>
                                                                    <span className="text-sm md:text-xl font-black text-indigo-600 tabular-nums flex items-center justify-center">${day.dolares.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                                                                    <div className="flex flex-col items-end justify-center">
                                                                        <span className="text-xs md:text-lg font-bold text-gray-600 tabular-nums">{day.bs.toLocaleString('es-VE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                                                                        {day.status !== 'operativo' && (
                                                                            <span className={`text-[8px] font-black uppercase tracking-tighter ${st.text} md:hidden`}>{st.label}</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                        <div className="text-center pt-1">
                                                            <span className="text-[10px] md:text-xs font-bold text-gray-400">{sortedDays.length} día{sortedDays.length !== 1 ? 's' : ''} registrado{sortedDays.length !== 1 ? 's' : ''}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}



                        <div className="mt-6 h-72 w-full relative z-10 outline-none">
                            <ResponsiveContainer width="100%" height="100%" style={{ outline: 'none' }}>
                                <AreaChart
                                    data={chartData}
                                    margin={{ top: 10, right: 10, left: 8, bottom: 0 }}
                                    style={{ outline: 'none' }}
                                >
                                    <defs>
                                        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.25} />
                                            <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid
                                        strokeDasharray="0"
                                        vertical={false}
                                        stroke="#f1f5f9"
                                        strokeWidth={1}
                                    />
                                    <XAxis
                                        dataKey="nameLabel"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#6b7280', fontSize: 11, fontWeight: 800 }}
                                        dy={12}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#6b7280', fontSize: 11, fontWeight: 800 }}
                                        tickFormatter={formatYAxis}
                                        dx={-4}
                                        width={56}
                                    />
                                    <Tooltip
                                        cursor={{ stroke: '#6366f1', strokeWidth: 1.5, strokeDasharray: '4 2' }}
                                        content={({ active, payload, label }) => {
                                            if (!active || !payload?.length) return null;
                                            const val = payload[0]?.value as number;
                                            return (
                                                <div className="bg-white/90 backdrop-blur-sm border border-indigo-100 rounded-2xl shadow-xl shadow-indigo-100/50 px-4 py-3 min-w-[120px]">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">{label}</p>
                                                    <p className="text-lg font-black text-indigo-700">
                                                        {formatYAxis(val)}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Total USD</p>
                                                </div>
                                            );
                                        }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="total_dolares"
                                        stroke="#6366f1"
                                        strokeWidth={3}
                                        fill="url(#areaGradient)"
                                        dot={{ r: 5, fill: '#fff', stroke: '#6366f1', strokeWidth: 2.5 }}
                                        activeDot={{ r: 7, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
                                        animationDuration={1200}
                                        animationEasing="ease-in-out"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

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
