export type RegistroStatus = "operativo" | "lluvia" | "mudanza" | "libre" | "otro";

export interface RegistroDiario {
  id: string; // YYYY-MM-DD_locationId
  fecha: string; // YYYY-MM-DD
  locacionId: string;
  tickets: number;
  tasaDolar: number;
  totalCalculado: number; // tickets * tasaDolar (si el ticket vale $1)
  status: RegistroStatus;
  motivoInactividad?: string;
  comentarios?: string;
  createdAt: any;
}

export interface Locacion {
  id: string;
  nombre: string;
}
