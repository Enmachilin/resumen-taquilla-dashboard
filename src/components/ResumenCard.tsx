import { RegistroDiario } from "@/types";

interface ResumenCardProps {
  actual: RegistroDiario;
  anterior: RegistroDiario | null;
}

const LOCATION_COLORS = [
  "bg-blue-600",
  "bg-purple-600",
  "bg-pink-600",
  "bg-orange-500",
  "bg-teal-600",
  "bg-indigo-600",
  "bg-emerald-600",
  "bg-rose-600",
  "bg-cyan-600",
];

const getLocacionColor = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return LOCATION_COLORS[Math.abs(hash) % LOCATION_COLORS.length];
};

export default function ResumenCard({ actual, anterior }: ResumenCardProps) {
  const isOperativo = actual.status === "operativo";
  const colorClass = getLocacionColor(actual.locacionId);
  
  let diferencia = 0;
  let trendIndicator = null;
  
  if (isOperativo && anterior && anterior.status === "operativo" && anterior.tickets > 0) {
    diferencia = ((actual.tickets / anterior.tickets) - 1) * 100;
    
    if (diferencia > 0) {
      trendIndicator = (
        <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-black ml-2 flex items-center gap-1">
          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
          MEJOR
        </span>
      );
    } else if (diferencia < 0) {
      trendIndicator = (
        <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded-full font-black ml-2 flex items-center gap-1">
          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
          MENOR
        </span>
      );
    }
  }

  return (
    <div className={`p-4 rounded-xl text-white shadow-lg transition-transform hover:scale-105 border-b-4 border-black/10 ${colorClass}`}>
      <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-[10px] font-black opacity-80 uppercase tracking-widest truncate">
            {actual.locacionId.replace(/-/g, ' ')}
          </h3>
          <p className="text-2xl font-black mt-1 leading-none">
            {isOperativo ? `${actual.tickets}` : actual.status.toUpperCase()}
            {isOperativo && <span className="text-sm ml-2 opacity-60">Tickets</span>}
          </p>
          {isOperativo && (
            <div className="flex items-center gap-2 mt-1 whitespace-nowrap">
              <span className="text-[11px] font-bold opacity-90">
                 {actual.totalCalculado.toLocaleString('es-VE', { minimumFractionDigits: 0 })} <span className="text-[8px]">Bs.</span>
              </span>
              <span className="text-[10px] font-bold text-white bg-white/20 px-1.5 py-0.5 rounded-md">
                ${(actual.precioTicket ? actual.tickets * actual.precioTicket : actual.tickets).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>
        {isOperativo && anterior && (
          <div className="text-right bg-white/10 p-1.5 rounded-lg backdrop-blur-sm self-end sm:self-start">
            <span className="text-[9px] opacity-80 block font-bold leading-none mb-1">vs {anterior.tickets}</span>
            <div className="flex items-center justify-end gap-1">
              <span className="text-sm font-black">
                {diferencia > 0 ? '+' : ''}{diferencia.toFixed(0)}%
              </span>
              <span className="text-[10px]">
                {diferencia > 0 ? (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </span>
            </div>
          </div>
        )}
      </div>
      
      {isOperativo && (
        <div className="mt-3 pt-3 border-t border-white/10 flex justify-between items-center">
          <span className="text-[9px] font-bold opacity-60">{actual.fecha}</span>
          {actual.precioTicket && <span className="text-[9px] font-bold opacity-90 bg-black/20 px-2 py-0.5 rounded-full shadow-inner shadow-black/30">Precio: ${actual.precioTicket}</span>}
          <span className="text-[9px] font-bold opacity-60">BCV: {actual.tasaDolar}</span>
        </div>
      )}
      
      {!isOperativo && actual.motivoInactividad && (
        <p className="mt-2 text-sm italic bg-black/10 p-2 rounded-lg">"{actual.motivoInactividad}"</p>
      )}
    </div>
  );
}
