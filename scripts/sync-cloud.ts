/**
 * Sincroniza los últimos 2000 movimientos de SQL Server a Firestore.
 *
 *   npm run sync-cloud
 *
 * Pensado para ejecutarse cada 15 minutos vía Programador de Tareas Windows.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import sql, { type ConnectionPool, type config as SqlConfig } from "mssql";
import { Timestamp } from "firebase-admin/firestore";
import {
  FirebaseConfigError,
  getAdminFirestore,
  getFirebaseAdminConfig,
} from "../src/lib/firebaseAdmin";

const TOP_N = Number(process.env.SYNC_TOP_N ?? "2000");
const COLLECTION = "movimientos";
const META_DOC = "meta/sync";
const FIRESTORE_BATCH_SIZE = 500;

interface Row {
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
  CodigoProducto: number | null;
  NombreProducto: string | null;
  NombreConductor: string | null;
}

function buildSqlConfig(): SqlConfig {
  const server = process.env.SQL_SERVER ?? "localhost";
  const portRaw = process.env.SQL_PORT;
  const instance = process.env.SQL_INSTANCE;
  const database = process.env.SQL_DATABASE ?? "DOSIPACK_CAMIONERA_OMYA";
  const user = process.env.SQL_USER ?? "DosiAdmin";
  const password = process.env.SQL_PASSWORD ?? "BACKFRONTFLIP";
  const encrypt = (process.env.SQL_ENCRYPT ?? "false").toLowerCase() === "true";
  const trust =
    (process.env.SQL_TRUST_SERVER_CERTIFICATE ?? "true").toLowerCase() === "true";

  const cfg: SqlConfig = {
    server,
    database,
    user,
    password,
    options: {
      encrypt,
      trustServerCertificate: trust,
      ...(instance ? { instanceName: instance } : {}),
    },
    requestTimeout: 60_000,
    connectionTimeout: 30_000,
  };
  if (portRaw) {
    const port = Number(portRaw);
    if (!Number.isNaN(port)) cfg.port = port;
  }
  return cfg;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function toIsoDate(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return `${value.getUTCFullYear()}-${pad2(value.getUTCMonth() + 1)}-${pad2(value.getUTCDate())}`;
  }
  return String(value);
}

function toTimeString(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return `${pad2(value.getUTCHours())}:${pad2(value.getUTCMinutes())}:${pad2(value.getUTCSeconds())}`;
  }
  return String(value);
}

function toNum(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function fetchTopMovimientos(pool: ConnectionPool): Promise<Row[]> {
  const result = await pool.request().query(`
    SELECT TOP ${TOP_N}
      CodigoMovimiento, Placa, PesoEntrada, PesoSalida, PesoTotal,
      FechaEntrada, HoraEntrada, FechaSalida, HoraSalida,
      EstadoMovimiento, UsuarioPesajeEntrada, UsuarioPesajeSalida,
      Observaciones, TipoProceso, AlarmaPesoManual, AlarmaPesoVacio,
      BasculaEntrada, BasculaSalida,
      CodigoProducto, NombreProducto, NombreConductor
    FROM dbo.Movimientos
    WHERE EstadoMovimiento IN (1, 2, 99)
      AND Reportado = 0
    ORDER BY CodigoMovimiento DESC
  `);

  return result.recordset.map((r): Row => {
    const fechaEntrada = toIsoDate(r.FechaEntrada);
    const horaEntrada = toTimeString(r.HoraEntrada);
    const entradaIso = fechaEntrada
      ? `${fechaEntrada} ${horaEntrada ?? "00:00:00"}`
      : null;
    return {
      CodigoMovimiento: Number(r.CodigoMovimiento),
      Placa: r.Placa ?? null,
      PesoEntrada: toNum(r.PesoEntrada),
      PesoSalida: toNum(r.PesoSalida),
      PesoTotal: toNum(r.PesoTotal),
      FechaEntrada: fechaEntrada,
      HoraEntrada: horaEntrada,
      FechaSalida: toIsoDate(r.FechaSalida),
      HoraSalida: toTimeString(r.HoraSalida),
      EstadoMovimiento: toNum(r.EstadoMovimiento),
      UsuarioPesajeEntrada: r.UsuarioPesajeEntrada ?? null,
      UsuarioPesajeSalida: r.UsuarioPesajeSalida ?? null,
      Observaciones: r.Observaciones ?? null,
      TipoProceso: toNum(r.TipoProceso),
      AlarmaPesoManual: toNum(r.AlarmaPesoManual),
      AlarmaPesoVacio: toNum(r.AlarmaPesoVacio),
      BasculaEntrada: toNum(r.BasculaEntrada),
      BasculaSalida: toNum(r.BasculaSalida),
      EntradaIso: entradaIso,
      CodigoProducto: toNum(r.CodigoProducto),
      NombreProducto: r.NombreProducto ?? null,
      NombreConductor: r.NombreConductor ?? null,
    };
  });
}

async function upsertBatches(rows: Row[]): Promise<void> {
  const db = getAdminFirestore();
  const col = db.collection(COLLECTION);
  for (let i = 0; i < rows.length; i += FIRESTORE_BATCH_SIZE) {
    const chunk = rows.slice(i, i + FIRESTORE_BATCH_SIZE);
    const batch = db.batch();
    for (const row of chunk) {
      batch.set(col.doc(String(row.CodigoMovimiento)), row);
    }
    await batch.commit();
    process.stdout.write(`  upsert ${i + chunk.length}/${rows.length}\r`);
  }
  process.stdout.write("\n");
}

async function markAsReported(pool: ConnectionPool, codigos: number[]): Promise<void> {
  if (codigos.length === 0) return;
  // Dividimos en lotes para no exceder límites de SQL
  const batchSize = 500;
  for (let i = 0; i < codigos.length; i += batchSize) {
    const chunk = codigos.slice(i, i + batchSize);
    await pool.request().query(`
      UPDATE dbo.Movimientos
      SET Reportado = 1
      WHERE CodigoMovimiento IN (${chunk.join(",")})
    `);
  }
}

async function pruneToLimit(): Promise<number> {
  const db = getAdminFirestore();
  const col = db.collection(COLLECTION);
  // Obtenemos todos los documentos ordenados por código descendente
  const snapshot = await col
    .orderBy("CodigoMovimiento", "desc")
    .select("CodigoMovimiento")
    .get();

  if (snapshot.size <= TOP_N) return 0;

  const toDelete = snapshot.docs.slice(TOP_N);
  let deleted = 0;
  for (let i = 0; i < toDelete.length; i += FIRESTORE_BATCH_SIZE) {
    const chunk = toDelete.slice(i, i + FIRESTORE_BATCH_SIZE);
    const batch = db.batch();
    for (const doc of chunk) batch.delete(doc.ref);
    await batch.commit();
    deleted += chunk.length;
  }
  return deleted;
}

async function updateSyncMeta(
  rowCount: number,
  minCodigo: number,
  maxCodigo: number,
): Promise<void> {
  const db = getAdminFirestore();
  await db.doc(META_DOC).set({
    lastSyncAt: Timestamp.now(),
    rowCount,
    minCodigo,
    maxCodigo,
  });
}

async function main(): Promise<void> {
  console.log(`[sync-cloud] iniciando — TOP ${TOP_N}`);
  getFirebaseAdminConfig(); // valida vars antes de tocar SQL

  console.log("[sync-cloud] conectando a SQL Server...");
  const pool = await sql.connect(buildSqlConfig());
  try {
    const rows = await fetchTopMovimientos(pool);
    console.log(`[sync-cloud] ${rows.length} filas leídas de SQL Server`);
    if (rows.length === 0) {
      console.log("[sync-cloud] nada para sincronizar");
      return;
    }

    await upsertBatches(rows);

    const codigosArr = rows.map((r) => r.CodigoMovimiento);
    const codigosSet = new Set(codigosArr);
    const minCodigo = Math.min(...codigosArr);
    const maxCodigo = Math.max(...codigosArr);

    // Marcamos como reportados en SQL Server
    console.log("[sync-cloud] marcando como reportados en SQL Server...");
    await markAsReported(pool, codigosArr);

    // Limpieza de registros muy viejos en Firestore para mantener solo los TOP_N (2000)
    const deleted = await pruneToLimit();
    if (deleted > 0) {
      console.log(`[sync-cloud] eliminados ${deleted} docs antiguos en Firestore`);
    }

    await updateSyncMeta(rows.length, minCodigo, maxCodigo);

    console.log(
      `[sync-cloud] OK — ${rows.length} filas sincronizadas y marcadas como reportadas`,
    );
  } finally {
    await pool.close();
  }
}

main().catch((err: unknown) => {
  if (err instanceof FirebaseConfigError) {
    console.error(`[sync-cloud] Firebase: ${err.message}`);
  } else if (err instanceof Error) {
    console.error(`[sync-cloud] error: ${err.message}`);
  } else {
    console.error("[sync-cloud] error desconocido", err);
  }
  process.exitCode = 1;
});
