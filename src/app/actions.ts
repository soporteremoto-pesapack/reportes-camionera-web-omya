"use server";

import { getMovimientos } from "@/services/movimientosService";
import {
  getMovimientosFromFirestore,
  getSyncStatus,
} from "@/services/movimientosFirestoreService";
import { isFirebaseConfigured } from "@/lib/firebaseAdmin";
import type { Movimiento, MovimientoFilter } from "@/lib/types";

export type MovimientosSource = "sql" | "firestore";

export interface MovimientosResponse {
  data: Movimiento[];
  source: MovimientosSource;
  lastSyncAt: string | null;
  warning: string | null;
}

export async function fetchMovimientosAction(
  filter: MovimientoFilter,
): Promise<MovimientosResponse> {
  if (!isFirebaseConfigured()) {
    throw new Error(
      "La configuración de Firebase no está disponible. No se pueden consultar los datos.",
    );
  }

  try {
    const [data, status] = await Promise.all([
      getMovimientosFromFirestore(filter),
      getSyncStatus(),
    ]);
    return {
      data,
      source: "firestore",
      lastSyncAt: status.lastSyncAt,
      warning: null, // Ya no es una advertencia, es el comportamiento normal
    };
  } catch (cloudErr) {
    const cloudMsg = cloudErr instanceof Error ? cloudErr.message : String(cloudErr);
    throw new Error(`Error consultando Firestore: ${cloudMsg}`);
  }
}
