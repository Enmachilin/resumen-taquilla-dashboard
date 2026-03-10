export type RegistroStatus = "operativo" | "lluvia" | "mudanza" | "libre" | "otro";

export interface RegistroDiario {
  id: string; // YYYY-MM-DD_locationId
  fecha: string; // YYYY-MM-DD
  locacionId: string;
  tickets: number;
  precioTicket?: number; // nuevo campo para precio variable
  tasaDolar: number;
  totalCalculado: number; // tickets * precioTicket * tasaDolar
  status: RegistroStatus;
  motivoInactividad?: string;
  comentarios?: string;
  createdAt: any;
}

export interface Locacion {
  id: string;
  nombre: string;
}
