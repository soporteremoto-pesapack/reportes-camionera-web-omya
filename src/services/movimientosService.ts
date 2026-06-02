"use server";

import { getPool, sql } from "@/lib/db";
import type { Movimiento, MovimientoFilter } from "@/lib/types";

function toIsoDate(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, "0");
    const d = String(value.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return String(value);
}

function toTimeString(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    const h = String(value.getUTCHours()).padStart(2, "0");
    const m = String(value.getUTCMinutes()).padStart(2, "0");
    const s = String(value.getUTCSeconds()).padStart(2, "0");
    return `${h}:${m}:${s}`;
  }
  return String(value);
}

function combineTimestamp(date: string | null, time: string | null): string | null {
  if (!date) return null;
  return `${date}T${time ?? "00:00:00"}`;
}

function toNumberOrNull(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function getMovimientos(filter: MovimientoFilter): Promise<Movimiento[]> {
  const pool = await getPool();
  const request = pool.request();

  const conditions: string[] = [];

  // Rango fecha+hora basado en FechaEntrada/HoraEntrada (siempre aplica)
  conditions.push(
    "(CAST(FechaEntrada AS datetime) + CAST(ISNULL(HoraEntrada,'00:00:00') AS datetime)) BETWEEN @desde AND @hasta",
  );
  request.input("desde", sql.DateTime, new Date(filter.fechaDesde));
  request.input("hasta", sql.DateTime, new Date(filter.fechaHasta));

  if (filter.placa && filter.placa.trim()) {
    request.input("placa", sql.NVarChar(20), `%${filter.placa.trim()}%`);
    conditions.push("Placa LIKE @placa");
  }

  if (filter.estados && filter.estados.length > 0) {
    const params = filter.estados.map((e, i) => {
      const name = `estado${i}`;
      request.input(name, sql.TinyInt, e);
      return `@${name}`;
    });
    conditions.push(`EstadoMovimiento IN (${params.join(",")})`);
  }

  if (filter.tipos && filter.tipos.length > 0) {
    const params = filter.tipos.map((t, i) => {
      const name = `tipo${i}`;
      request.input(name, sql.Int, t);
      return `@${name}`;
    });
    conditions.push(`TipoProceso IN (${params.join(",")})`);
  }

  const where = `WHERE ${conditions.join(" AND ")}`;
  const query = `
    SELECT
      CodigoMovimiento, Placa, PesoEntrada, PesoSalida, PesoTotal,
      FechaEntrada, HoraEntrada, FechaSalida, HoraSalida,
      EstadoMovimiento, UsuarioPesajeEntrada, UsuarioPesajeSalida,
      Observaciones, TipoProceso, AlarmaPesoManual, AlarmaPesoVacio,
      BasculaEntrada, BasculaSalida,
      CodigoProducto, NombreProducto, NombreConductor
    FROM dbo.Movimientos
    ${where}
    ORDER BY FechaEntrada DESC, HoraEntrada DESC, CodigoMovimiento DESC
  `;

  const result = await request.query(query);

  return result.recordset.map((row): Movimiento => {
    const fechaEntrada = toIsoDate(row.FechaEntrada);
    const horaEntrada = toTimeString(row.HoraEntrada);
    const fechaSalida = toIsoDate(row.FechaSalida);
    const horaSalida = toTimeString(row.HoraSalida);
    return {
      CodigoMovimiento: Number(row.CodigoMovimiento),
      Placa: row.Placa ?? null,
      PesoEntrada: toNumberOrNull(row.PesoEntrada),
      PesoSalida: toNumberOrNull(row.PesoSalida),
      PesoTotal: toNumberOrNull(row.PesoTotal),
      FechaEntrada: fechaEntrada,
      HoraEntrada: horaEntrada,
      FechaSalida: fechaSalida,
      HoraSalida: horaSalida,
      EstadoMovimiento: toNumberOrNull(row.EstadoMovimiento),
      UsuarioPesajeEntrada: row.UsuarioPesajeEntrada ?? null,
      UsuarioPesajeSalida: row.UsuarioPesajeSalida ?? null,
      Observaciones: row.Observaciones ?? null,
      TipoProceso: toNumberOrNull(row.TipoProceso),
      AlarmaPesoManual: toNumberOrNull(row.AlarmaPesoManual),
      AlarmaPesoVacio: toNumberOrNull(row.AlarmaPesoVacio),
      BasculaEntrada: toNumberOrNull(row.BasculaEntrada),
      BasculaSalida: toNumberOrNull(row.BasculaSalida),
      EntradaTimestamp: combineTimestamp(fechaEntrada, horaEntrada),
      SalidaTimestamp: combineTimestamp(fechaSalida, horaSalida),
      CodigoProducto: toNumberOrNull(row.CodigoProducto),
      NombreProducto: row.NombreProducto ?? null,
      NombreConductor: row.NombreConductor ?? null,
    };
  });
}
