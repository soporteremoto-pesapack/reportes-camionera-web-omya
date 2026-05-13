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
  try {
    const data = await getMovimientos(filter);
    return { data, source: "sql", lastSyncAt: null, warning: null };
  } catch (sqlErr) {
    const sqlMsg = sqlErr instanceof Error ? sqlErr.message : String(sqlErr);

    if (!isFirebaseConfigured()) {
      throw sqlErr;
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
        warning: `SQL Server no disponible (${sqlMsg}). Mostrando últimos reportes sincronizados a la nube.`,
      };
    } catch (cloudErr) {
      const cloudMsg = cloudErr instanceof Error ? cloudErr.message : String(cloudErr);
      throw new Error(
        `SQL Server falló (${sqlMsg}) y la nube tampoco respondió (${cloudMsg}).`,
      );
    }
  }
}
