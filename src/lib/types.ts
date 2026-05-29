export type EstadoMovimiento = 1 | 2 | 99;
export type TipoProceso = 0 | 1;

export const ESTADO_MOVIMIENTO_LABELS: Record<number, string> = {
  1: "INCOMPLETO",
  2: "COMPLETO",
  99: "ELIMINADO",
};

export const TIPO_PROCESO_LABELS: Record<number, string> = {
  0: "ENTRADA",
  1: "SALIDA",
};

export const BASCULA_LABELS: Record<number, string> = {
  0: "—",
  1: "Báscula 1",
  2: "Báscula 2",
};

export const SI_NO_LABELS: Record<number, string> = {
  0: "No",
  1: "Sí",
};

export interface Movimiento {
  CodigoMovimiento: number;
  Placa: string | null;
  PesoEntrada: number | null;
  PesoSalida: number | null;
  PesoTotal: number | null;
  FechaEntrada: string | null;
  HoraEntrada: string | null;
  FechaSalida: string | null;
  HoraSalida: string | null;
  EstadoMovimiento: number | null;
  UsuarioPesajeEntrada: string | null;
  UsuarioPesajeSalida: string | null;
  Observaciones: string | null;
  TipoProceso: number | null;
  AlarmaPesoManual: number | null;
  AlarmaPesoVacio: number | null;
  BasculaEntrada: number | null;
  BasculaSalida: number | null;
  EntradaTimestamp: string | null;
  SalidaTimestamp: string | null;
  CodigoProducto: number | null;
  NombreProducto: string | null;
  NombreConductor: string | null;
}

export interface MovimientoFilter {
  fechaDesde: string;
  fechaHasta: string;
  placa?: string;
  estados?: number[];
  tipos?: number[];
}
