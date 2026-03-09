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
      trendIndicator = <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold ml-2">↑ MEJOR</span>;
    } else if (diferencia < 0) {
      trendIndicator = <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded-full font-bold ml-2">↓ MENOR</span>;
    }
  }

  return (
    <div className={`p-5 rounded-2xl text-white shadow-lg transition-transform hover:scale-105 border-b-4 border-black/10 ${colorClass}`}>
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xs font-black opacity-80 uppercase tracking-widest flex items-center">
            {actual.locacionId.replace(/-/g, ' ')}
            {trendIndicator}
          </h3>
          <p className="text-3xl font-black mt-1">
            {isOperativo ? `${actual.tickets} Tickets` : actual.status.toUpperCase()}
          </p>
        </div>
        {isOperativo && anterior && (
          <div className="text-right bg-white/10 p-2 rounded-lg backdrop-blur-sm">
            <span className="text-[10px] opacity-80 block font-bold mb-1">CIE: {anterior.tickets}</span>
            <span className="text-xl font-black">
              {diferencia > 0 ? '+' : ''}{diferencia.toFixed(0)}%
            </span>
          </div>
        )}
      </div>
      
      {isOperativo && (
        <div className="mt-4 pt-4 border-t border-white/20 flex justify-between items-end">
          <div>
            <span className="text-[10px] opacity-70 block font-bold">FECHA REPORTE</span>
            <span className="text-sm font-bold">{actual.fecha}</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] opacity-70 block font-bold">BCV: {actual.tasaDolar}</span>
          </div>
        </div>
      )}
      
      {!isOperativo && actual.motivoInactividad && (
        <p className="mt-2 text-sm italic bg-black/10 p-2 rounded-lg">"{actual.motivoInactividad}"</p>
      )}
    </div>
  );
}
