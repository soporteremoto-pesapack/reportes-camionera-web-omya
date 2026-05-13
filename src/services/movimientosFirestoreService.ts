"use server";

import { Timestamp } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebaseAdmin";
import type { Movimiento, MovimientoFilter } from "@/lib/types";

export interface SyncStatus {
  lastSyncAt: string | null;
  rowCount: number | null;
}

const COLLECTION = "movimientos";
const META_DOC = "meta/sync";

interface FirestoreMovimientoDoc {
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
  EntradaIso: string | null;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function dateToLocalSqlString(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function combineTimestamp(date: string | null, time: string | null): string | null {
  if (!date) return null;
  return `${date}T${time ?? "00:00:00"}`;
}

function toMovimiento(d: FirestoreMovimientoDoc): Movimiento {
  return {
    CodigoMovimiento: Number(d.CodigoMovimiento),
    Placa: d.Placa,
    PesoEntrada: d.PesoEntrada,
    PesoSalida: d.PesoSalida,
    PesoTotal: d.PesoTotal,
    FechaEntrada: d.FechaEntrada,
    HoraEntrada: d.HoraEntrada,
    FechaSalida: d.FechaSalida,
    HoraSalida: d.HoraSalida,
    EstadoMovimiento: d.EstadoMovimiento,
    UsuarioPesajeEntrada: d.UsuarioPesajeEntrada,
    UsuarioPesajeSalida: d.UsuarioPesajeSalida,
    Observaciones: d.Observaciones,
    TipoProceso: d.TipoProceso,
    AlarmaPesoManual: d.AlarmaPesoManual,
    AlarmaPesoVacio: d.AlarmaPesoVacio,
    BasculaEntrada: d.BasculaEntrada,
    BasculaSalida: d.BasculaSalida,
    EntradaTimestamp: combineTimestamp(d.FechaEntrada, d.HoraEntrada),
    SalidaTimestamp: combineTimestamp(d.FechaSalida, d.HoraSalida),
  };
}

export async function getMovimientosFromFirestore(
  filter: MovimientoFilter,
): Promise<Movimiento[]> {
  const db = getAdminFirestore();
  const desde = dateToLocalSqlString(new Date(filter.fechaDesde));
  const hasta = dateToLocalSqlString(new Date(filter.fechaHasta));

  // Firestore solo permite UN range por consulta y los filtros LIKE no existen.
  // Hacemos el rango por EntradaIso en Firestore y el resto en memoria.
  const snap = await db
    .collection(COLLECTION)
    .where("EntradaIso", ">=", desde)
    .where("EntradaIso", "<=", hasta)
    .orderBy("EntradaIso", "desc")
    .get();

  const placaTerm = filter.placa?.trim().toLowerCase() ?? "";
  const estados = filter.estados ?? [];
  const tipos = filter.tipos ?? [];

  const result: Movimiento[] = [];
  for (const doc of snap.docs) {
    const data = doc.data() as FirestoreMovimientoDoc;
    if (placaTerm && !(data.Placa ?? "").toLowerCase().includes(placaTerm)) continue;
    if (estados.length > 0 && (data.EstadoMovimiento == null || !estados.includes(data.EstadoMovimiento))) continue;
    if (tipos.length > 0 && (data.TipoProceso == null || !tipos.includes(data.TipoProceso))) continue;
    result.push(toMovimiento(data));
  }
  return result;
}

export async function getSyncStatus(): Promise<SyncStatus> {
  const db = getAdminFirestore();
  const snap = await db.doc(META_DOC).get();
  if (!snap.exists) return { lastSyncAt: null, rowCount: null };
  const data = snap.data() ?? {};
  const ts = data.lastSyncAt;
  let lastSyncAt: string | null = null;
  if (ts instanceof Timestamp) lastSyncAt = ts.toDate().toISOString();
  else if (typeof ts === "string") lastSyncAt = ts;
  return {
    lastSyncAt,
    rowCount: typeof data.rowCount === "number" ? data.rowCount : null,
  };
}
