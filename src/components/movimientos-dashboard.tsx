"use client";

import { useEffect, useMemo, useState } from "react";
import { format, parseISO, subDays } from "date-fns";
import { es } from "date-fns/locale";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  CloudOff,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Loader2,
  RefreshCcw,
  Search,
  Sigma,
  Truck,
  Weight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ChartConfig } from "@/components/ui/chart";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { useToast } from "@/hooks/use-toast";
import {
  BASCULA_LABELS,
  ESTADO_MOVIMIENTO_LABELS,
  SI_NO_LABELS,
  TIPO_PROCESO_LABELS,
  type Movimiento,
  type MovimientoFilter,
} from "@/lib/types";
import { fetchMovimientosAction, type MovimientosSource } from "@/app/actions";

type SortKey = keyof Movimiento;
type SortConfig = { key: SortKey; direction: "asc" | "desc" };

const ROWS_PER_PAGE = 25;
const ESTADOS = [1, 2, 99] as const;
const TIPOS = [0, 1] as const;

const chartConfig = {
  total: {
    label: "Peso Total (kg)",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(s: string): Date {
  return new Date(s);
}

function formatDateTime(date: string | null, time: string | null): string {
  if (!date) return "—";
  try {
    const d = parseISO(`${date}T${time ?? "00:00:00"}`);
    return format(d, "dd/MM/yyyy HH:mm:ss", { locale: es });
  } catch {
    return `${date} ${time ?? ""}`;
  }
}

function formatNumber(n: number | null, decimals = 0): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "es", { numeric: true });
}

export function MovimientosDashboard() {
  const { toast } = useToast();

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 0);
    return d;
  }, []);
  const sevenAgo = useMemo(() => {
    const d = subDays(new Date(), 7);
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [fechaDesde, setFechaDesde] = useState<string>(toLocalInput(sevenAgo));
  const [fechaHasta, setFechaHasta] = useState<string>(toLocalInput(today));
  const [placa, setPlaca] = useState("");
  const [estadosSel, setEstadosSel] = useState<number[]>([]);
  const [tiposSel, setTiposSel] = useState<number[]>([]);

  const [data, setData] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<MovimientosSource>("sql");
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "EntradaTimestamp",
    direction: "desc",
  });
  const [page, setPage] = useState(1);

  const buildFilter = (): MovimientoFilter => ({
    fechaDesde: fromLocalInput(fechaDesde).toISOString(),
    fechaHasta: fromLocalInput(fechaHasta).toISOString(),
    placa: placa.trim() || undefined,
    estados: estadosSel.length ? estadosSel : undefined,
    tipos: tiposSel.length ? tiposSel : undefined,
  });

  const runQuery = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchMovimientosAction(buildFilter());
      setData(res.data);
      setSource(res.source);
      setLastSyncAt(res.lastSyncAt);
      setWarning(res.warning);
      setPage(1);
      if (res.source === "firestore") {
        toast({
          title: "Modo sin conexión",
          description: "Mostrando últimos reportes sincronizados a la nube.",
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error consultando la base de datos";
      setError(msg);
      setWarning(null);
      toast({
        title: "Error de consulta",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runQuery();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sortedData = useMemo(() => {
    const arr = [...data];
    arr.sort((a, b) => {
      const cmp = compareValues(a[sortConfig.key], b[sortConfig.key]);
      return sortConfig.direction === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [data, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / ROWS_PER_PAGE));
  const pageRows = useMemo(() => {
    const start = (page - 1) * ROWS_PER_PAGE;
    return sortedData.slice(start, start + ROWS_PER_PAGE);
  }, [sortedData, page]);

  const stats = useMemo(() => {
    const total = data.length;
    const pesoTotal = data.reduce((acc, m) => acc + (m.PesoTotal ?? 0), 0);
    const promedio = total > 0 ? pesoTotal / total : 0;
    return { total, pesoTotal, promedio };
  }, [data]);

  const chartData = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of data) {
      if (!m.FechaEntrada) continue;
      const key = m.FechaEntrada;
      map.set(key, (map.get(key) ?? 0) + (m.PesoTotal ?? 0));
    }
    return Array.from(map.entries())
      .map(([fecha, total]) => ({
        fecha,
        label: format(parseISO(fecha), "dd MMM", { locale: es }),
        total: Math.round(total),
      }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [data]);

  const handleSort = (key: SortKey) => {
    setSortConfig((cur) =>
      cur.key === key
        ? { key, direction: cur.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" },
    );
  };

  const sortArrow = (key: SortKey) =>
    sortConfig.key === key ? (sortConfig.direction === "asc" ? "▲" : "▼") : (
      <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-40" />
    );

  const toggleEstado = (v: number) =>
    setEstadosSel((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  const toggleTipo = (v: number) =>
    setTiposSel((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));

  const clearFilters = () => {
    setFechaDesde(toLocalInput(sevenAgo));
    setFechaHasta(toLocalInput(today));
    setPlaca("");
    setEstadosSel([]);
    setTiposSel([]);
  };

  const handleExportExcel = async () => {
    try {
      const xlsx = await import("xlsx");
      const rows = sortedData.map((m) => ({
        CodigoMovimiento: m.CodigoMovimiento,
        Placa: m.Placa ?? "",
        PesoEntrada: m.PesoEntrada ?? "",
        PesoSalida: m.PesoSalida ?? "",
        PesoTotal: m.PesoTotal ?? "",
        FechaEntrada: m.FechaEntrada ?? "",
        HoraEntrada: m.HoraEntrada ?? "",
        FechaSalida: m.FechaSalida ?? "",
        HoraSalida: m.HoraSalida ?? "",
        EstadoMovimiento:
          m.EstadoMovimiento != null
            ? ESTADO_MOVIMIENTO_LABELS[m.EstadoMovimiento] ?? m.EstadoMovimiento
            : "",
        UsuarioPesajeEntrada: m.UsuarioPesajeEntrada ?? "",
        UsuarioPesajeSalida: m.UsuarioPesajeSalida ?? "",
        Observaciones: m.Observaciones ?? "",
        TipoProceso:
          m.TipoProceso != null ? TIPO_PROCESO_LABELS[m.TipoProceso] ?? m.TipoProceso : "",
        AlarmaPesoManual:
          m.AlarmaPesoManual != null ? SI_NO_LABELS[m.AlarmaPesoManual] ?? m.AlarmaPesoManual : "",
        AlarmaPesoVacio:
          m.AlarmaPesoVacio != null ? SI_NO_LABELS[m.AlarmaPesoVacio] ?? m.AlarmaPesoVacio : "",
        BasculaEntrada:
          m.BasculaEntrada != null ? BASCULA_LABELS[m.BasculaEntrada] ?? m.BasculaEntrada : "",
        BasculaSalida:
          m.BasculaSalida != null ? BASCULA_LABELS[m.BasculaSalida] ?? m.BasculaSalida : "",
      }));
      const ws = xlsx.utils.json_to_sheet(rows);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, "Movimientos");
      const filename = `movimientos_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`;
      xlsx.writeFile(wb, filename);
    } catch (e) {
      toast({
        title: "Error exportando a Excel",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    }
  };

  const handleExportPdf = async () => {
    try {
      const { default: jsPDF } = await import("jspdf");
      const autoTableMod = await import("jspdf-autotable");
      const autoTable = (autoTableMod as { default: (doc: unknown, opts: unknown) => void }).default;

      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      doc.setFontSize(14);
      doc.text("Reporte de Movimientos - Camionera Omya Río Claro", 40, 40);
      doc.setFontSize(9);
      doc.text(
        `Rango: ${format(fromLocalInput(fechaDesde), "dd/MM/yyyy HH:mm")} a ${format(fromLocalInput(fechaHasta), "dd/MM/yyyy HH:mm")}`,
        40,
        58,
      );
      doc.text(`Registros: ${sortedData.length}`, 40, 72);

      autoTable(doc, {
        startY: 90,
        styles: { fontSize: 7, cellPadding: 3 },
        headStyles: { fillColor: [50, 100, 140] },
        head: [[
          "Cod",
          "Placa",
          "Entrada",
          "Salida",
          "P.Ent",
          "P.Sal",
          "P.Tot",
          "Estado",
          "Tipo",
          "Op.Ent",
          "Op.Sal",
          "Obs",
        ]],
        body: sortedData.map((m) => [
          m.CodigoMovimiento,
          m.Placa ?? "",
          formatDateTime(m.FechaEntrada, m.HoraEntrada),
          formatDateTime(m.FechaSalida, m.HoraSalida),
          formatNumber(m.PesoEntrada),
          formatNumber(m.PesoSalida),
          formatNumber(m.PesoTotal),
          m.EstadoMovimiento != null
            ? ESTADO_MOVIMIENTO_LABELS[m.EstadoMovimiento] ?? m.EstadoMovimiento
            : "",
          m.TipoProceso != null ? TIPO_PROCESO_LABELS[m.TipoProceso] ?? m.TipoProceso : "",
          m.UsuarioPesajeEntrada ?? "",
          m.UsuarioPesajeSalida ?? "",
          m.Observaciones ?? "",
        ]),
      });

      const filename = `movimientos_${format(new Date(), "yyyyMMdd_HHmm")}.pdf`;
      doc.save(filename);
    } catch (e) {
      toast({
        title: "Error exportando a PDF",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    }
  };

  const lastSyncLabel = useMemo(() => {
    if (!lastSyncAt) return null;
    try {
      return format(parseISO(lastSyncAt), "dd/MM/yyyy HH:mm:ss", { locale: es });
    } catch {
      return lastSyncAt;
    }
  }, [lastSyncAt]);

  return (
    <div className="flex flex-col gap-6">
      {source === "firestore" && (
        <div className="flex items-start gap-3 rounded-md border border-amber-500/50 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          <CloudOff className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">Modo sin conexión — datos desde la nube</p>
            <p className="text-xs">
              {warning ?? "No se pudo conectar al SQL Server local."}
              {lastSyncLabel
                ? ` Última sincronización: ${lastSyncLabel}.`
                : ""}
            </p>
          </div>
        </div>
      )}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            <CardTitle>Filtros</CardTitle>
          </div>
          <CardDescription>
            El rango de fecha-hora siempre aplica. Los demás filtros son opcionales.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="desde">Desde (fecha y hora)</Label>
              <Input
                id="desde"
                type="datetime-local"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hasta">Hasta (fecha y hora)</Label>
              <Input
                id="hasta"
                type="datetime-local"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="placa">Placa</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="placa"
                  className="pl-8"
                  placeholder="Buscar por placa..."
                  value={placa}
                  onChange={(e) => setPlaca(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") runQuery();
                  }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Acciones</Label>
              <div className="flex gap-2">
                <Button onClick={runQuery} disabled={loading} className="flex-1">
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="mr-2 h-4 w-4" />
                  )}
                  Buscar
                </Button>
                <Button variant="outline" onClick={clearFilters} disabled={loading}>
                  <RefreshCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Estado del movimiento</Label>
              <div className="flex flex-wrap gap-3">
                {ESTADOS.map((e) => (
                  <label
                    key={e}
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent/30"
                  >
                    <Checkbox
                      checked={estadosSel.includes(e)}
                      onCheckedChange={() => toggleEstado(e)}
                    />
                    {e} - {ESTADO_MOVIMIENTO_LABELS[e]}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tipo de proceso</Label>
              <div className="flex flex-wrap gap-3">
                {TIPOS.map((t) => (
                  <label
                    key={t}
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent/30"
                  >
                    <Checkbox
                      checked={tiposSel.includes(t)}
                      onCheckedChange={() => toggleTipo(t)}
                    />
                    {t} - {TIPO_PROCESO_LABELS[t]}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de movimientos</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Registros en el rango seleccionado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peso total acumulado</CardTitle>
            <Sigma className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.pesoTotal)} kg</div>
            <p className="text-xs text-muted-foreground">Suma de PesoTotal</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peso promedio</CardTitle>
            <Weight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.promedio)} kg</div>
            <p className="text-xs text-muted-foreground">Promedio por movimiento</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Peso total por día</CardTitle>
          <CardDescription>Distribución diaria del peso registrado.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[260px] w-full">
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                <Tooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                <Bar dataKey="total" fill="var(--color-total)" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Movimientos</CardTitle>
              <CardDescription>
                {sortedData.length} registro{sortedData.length === 1 ? "" : "s"} encontrado
                {sortedData.length === 1 ? "" : "s"}.
              </CardDescription>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={sortedData.length === 0}>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={handleExportExcel}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handleExportPdf}>
                  <FileText className="mr-2 h-4 w-4" />
                  PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative w-full overflow-x-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm">
                <TableRow>
                  <TableHead>
                    <button
                      type="button"
                      onClick={() => handleSort("CodigoMovimiento")}
                      className="font-medium"
                    >
                      Código {sortArrow("CodigoMovimiento")}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button type="button" onClick={() => handleSort("Placa")} className="font-medium">
                      Placa {sortArrow("Placa")}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      type="button"
                      onClick={() => handleSort("EntradaTimestamp")}
                      className="font-medium"
                    >
                      Entrada {sortArrow("EntradaTimestamp")}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      type="button"
                      onClick={() => handleSort("SalidaTimestamp")}
                      className="font-medium"
                    >
                      Salida {sortArrow("SalidaTimestamp")}
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button
                      type="button"
                      onClick={() => handleSort("PesoEntrada")}
                      className="font-medium"
                    >
                      Peso Ent. {sortArrow("PesoEntrada")}
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button
                      type="button"
                      onClick={() => handleSort("PesoSalida")}
                      className="font-medium"
                    >
                      Peso Sal. {sortArrow("PesoSalida")}
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button
                      type="button"
                      onClick={() => handleSort("PesoTotal")}
                      className="font-semibold"
                    >
                      Peso Total {sortArrow("PesoTotal")}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      type="button"
                      onClick={() => handleSort("EstadoMovimiento")}
                      className="font-medium"
                    >
                      Estado {sortArrow("EstadoMovimiento")}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      type="button"
                      onClick={() => handleSort("TipoProceso")}
                      className="font-medium"
                    >
                      Tipo {sortArrow("TipoProceso")}
                    </button>
                  </TableHead>
                  <TableHead>Op. Entrada</TableHead>
                  <TableHead>Op. Salida</TableHead>
                  <TableHead>Báscula Ent.</TableHead>
                  <TableHead>Báscula Sal.</TableHead>
                  <TableHead>A.Manual</TableHead>
                  <TableHead>A.Vacío</TableHead>
                  <TableHead>Observaciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={16} className="py-8 text-center text-muted-foreground">
                      <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                      Consultando...
                    </TableCell>
                  </TableRow>
                )}
                {!loading && pageRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={16} className="py-8 text-center text-muted-foreground">
                      Sin resultados.
                    </TableCell>
                  </TableRow>
                )}
                {!loading &&
                  pageRows.map((m) => (
                    <TableRow key={m.CodigoMovimiento}>
                      <TableCell className="font-mono">{m.CodigoMovimiento}</TableCell>
                      <TableCell className="font-medium">{m.Placa ?? "—"}</TableCell>
                      <TableCell>{formatDateTime(m.FechaEntrada, m.HoraEntrada)}</TableCell>
                      <TableCell>{formatDateTime(m.FechaSalida, m.HoraSalida)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(m.PesoEntrada)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(m.PesoSalida)}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatNumber(m.PesoTotal)}
                      </TableCell>
                      <TableCell>
                        {m.EstadoMovimiento != null
                          ? ESTADO_MOVIMIENTO_LABELS[m.EstadoMovimiento] ?? m.EstadoMovimiento
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {m.TipoProceso != null
                          ? TIPO_PROCESO_LABELS[m.TipoProceso] ?? m.TipoProceso
                          : "—"}
                      </TableCell>
                      <TableCell>{m.UsuarioPesajeEntrada ?? "—"}</TableCell>
                      <TableCell>{m.UsuarioPesajeSalida ?? "—"}</TableCell>
                      <TableCell>
                        {m.BasculaEntrada != null
                          ? BASCULA_LABELS[m.BasculaEntrada] ?? m.BasculaEntrada
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {m.BasculaSalida != null
                          ? BASCULA_LABELS[m.BasculaSalida] ?? m.BasculaSalida
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {m.AlarmaPesoManual != null
                          ? SI_NO_LABELS[m.AlarmaPesoManual] ?? m.AlarmaPesoManual
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {m.AlarmaPesoVacio != null
                          ? SI_NO_LABELS[m.AlarmaPesoVacio] ?? m.AlarmaPesoVacio
                          : "—"}
                      </TableCell>
                      <TableCell
                        className="max-w-[260px] truncate"
                        title={m.Observaciones ?? undefined}
                      >
                        {m.Observaciones ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between gap-2 py-4">
            <div className="text-sm text-muted-foreground">
              Página {page} de {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
