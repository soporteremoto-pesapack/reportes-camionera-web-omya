# Reportes Camionera Dosipack — Omya Río Claro

Aplicación web (Next.js 15 + React 18 + Tailwind + shadcn/ui) para consultar y exportar movimientos de pesaje desde la base de datos `DOSIPACK_CAMIONERA_OMYA` (SQL Server, tabla `dbo.Movimientos`).

## Características

- Conexión directa a SQL Server (paquete `mssql`).
- **Sincronización a Firestore (Firebase)**: los últimos 2000 movimientos se
  replican cada 15 minutos a una colección Firestore en la nube. Si SQL
  Server no está disponible, el dashboard cae automáticamente a Firestore
  y muestra un banner de "Modo sin conexión" con la fecha de la última
  sincronización.
- Filtros:
  - **Rango de fecha y hora** (siempre aplica).
  - **Placa** (LIKE).
  - **EstadoMovimiento** (1 INCOMPLETO, 2 COMPLETO, 99 ELIMINADO) — multi-selección opcional.
  - **TipoProceso** (0 ENTRADA, 1 SALIDA) — multi-selección opcional.
- Tabla con todos los campos, ordenable y paginada.
- KPIs (total movimientos, peso total acumulado, peso promedio).
- Gráfica de peso total por día.
- Exportación a **Excel (.xlsx)** y **PDF**.

## Requisitos

- Node.js 20+ y npm
- SQL Server con autenticación SQL habilitada y red TCP/IP activa
- Usuario con permisos `SELECT` sobre `dbo.Movimientos`

## Instalación

```bash
npm install
copy .env.local.example .env.local
# editar .env.local con los datos reales del servidor
npm run dev
```

La app queda en `http://localhost:9002`.

## Variables de entorno (`.env.local`)

| Variable | Descripción | Por defecto |
|---|---|---|
| `SQL_SERVER` | Host del SQL Server | `localhost` |
| `SQL_PORT` | Puerto TCP (omitir si se usa instancia nombrada) | `1433` |
| `SQL_INSTANCE` | Instancia nombrada (ej. `SQLEXPRESS`) | — |
| `SQL_DATABASE` | Base de datos | `DOSIPACK_CAMIONERA_OMYA` |
| `SQL_USER` | Usuario | `DosiAdmin` |
| `SQL_PASSWORD` | Contraseña | `BACKFRONTFLIP` |
| `SQL_ENCRYPT` | TLS hacia el servidor | `false` |
| `SQL_TRUST_SERVER_CERTIFICATE` | Aceptar certificado autofirmado | `true` |
| `FIREBASE_PROJECT_ID` | Project ID del proyecto Firebase | — |
| `FIREBASE_CLIENT_EMAIL` | Service account email (del JSON de credenciales) | — |
| `FIREBASE_PRIVATE_KEY` | Private key de la service account (con `\n` literales) | — |
| `SYNC_TOP_N` | Cantidad de movimientos a replicar | `2000` |

## Sincronización a Firestore (modo sin conexión)

La aplicación local de báscula es la que escribe en SQL Server. Esta web,
además de leer en vivo, replica los últimos 2000 movimientos a una
colección **Firestore** en Firebase. Eso permite que el dashboard siga
funcionando aunque la PC con SQL Server esté caída o la red interna no
esté disponible.

### 1. Crear el proyecto Firebase (una sola vez)

1. Andá a https://console.firebase.google.com y creá un proyecto nuevo
   (puede llamarse `reportes-camionera-omya`).
2. En el menú lateral elegí **Firestore Database** → **Create database** →
   modo **Production** → región (ej. `southamerica-east1`).

### 2. Crear la Service Account

1. En el panel del proyecto, click en **⚙ Project settings** →
   pestaña **Service accounts** → **Generate new private key**.
2. Se descarga un archivo `xxx-firebase-adminsdk-yyy.json`. Abrilo.
3. Copiá los tres campos a `.env.local`:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY` (entre comillas dobles, con
     los `\n` tal cual aparecen en el JSON).

> El JSON descargado **no** se commitea al repo. Después de copiar las
> tres líneas a `.env.local`, podés borrarlo o guardarlo en un lugar
> seguro fuera del proyecto.

### 3. Probar la sincronización

```bash
npm install
npm run sync-cloud
```

Salida esperada:

```
[sync-cloud] iniciando — TOP 2000
[sync-cloud] conectando a SQL Server...
[sync-cloud] 1832 filas leídas de SQL Server
  upsert 1832/1832
[sync-cloud] eliminados 0 docs antiguos
[sync-cloud] OK — 1832 filas sincronizadas a Firestore
```

### 4. Programar cada 15 minutos (Windows)

```powershell
schtasks /Create `
  /SC MINUTE /MO 15 `
  /TN "ReportesCamionera-SyncCloud" `
  /TR "cmd /c cd /d \"C:\ruta\al\proyecto\" && npm run sync-cloud >> sync-cloud.log 2>&1" `
  /RL HIGHEST /F
```

Ajustá la ruta. Para revisar/eliminar después:

```powershell
schtasks /Query /TN "ReportesCamionera-SyncCloud"
schtasks /Delete /TN "ReportesCamionera-SyncCloud" /F
```

### 5. Cómo se comporta el fallback

Cada vez que se pulsa **Buscar**:

1. La server action intenta `dbo.Movimientos` en SQL Server.
2. Si la conexión falla (red caída, servicio detenido, timeout), reintenta
   contra Firestore con los **mismos filtros** y muestra un banner ámbar
   *"Modo sin conexión — datos desde la nube"* con la fecha de la última
   sincronización.
3. Si tanto SQL Server como Firestore fallan, se muestra el error normal.

Las exportaciones (Excel/PDF) y la gráfica funcionan idénticamente sobre
los datos devueltos, vengan de donde vengan.

> Limitación de Firestore: el filtro de **placa** funciona como `LIKE
> %xxx%` pero se aplica del lado del servidor en memoria sobre el universo
> traído por el rango de fecha. Con 2000 movimientos como tope, el costo
> es despreciable.

## Build de producción

```bash
npm run build
npm run start
```

`npm run start` arranca en el puerto `9002`. Para que quede como servicio 24/7 en Windows, podés usar [NSSM](https://nssm.cc/) o `pm2-windows-service`.

## Publicación con Cloudflare Tunnel (opcional)

1. Instalar `cloudflared` (https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/).
2. Autenticar:

   ```bash
   cloudflared tunnel login
   ```

3. Crear un tunnel y apuntarlo al puerto local:

   ```bash
   cloudflared tunnel create camionera-omya
   cloudflared tunnel route dns camionera-omya reportes.tu-dominio.com
   cloudflared tunnel --url http://localhost:9002 run camionera-omya
   ```

Cloudflare expone `https://reportes.tu-dominio.com` con HTTPS y firewall, sin abrir puertos en el router.

## Estructura

```
scripts/
└── sync-cloud.ts             # job: SQL Server → Firestore (top 2000)
src/
├── app/
│   ├── actions.ts            # fetchMovimientosAction (con fallback a Firestore)
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── movimientos-dashboard.tsx
│   └── ui/                   # shadcn/ui
├── hooks/
├── lib/
│   ├── db.ts                 # pool mssql singleton
│   ├── firebaseAdmin.ts      # init firebase-admin (Firestore)
│   ├── types.ts              # Movimiento, MovimientoFilter, labels
│   └── utils.ts
└── services/
    ├── movimientosService.ts          # SELECT desde SQL Server
    └── movimientosFirestoreService.ts # query a Firestore
```

## Notas técnicas

- La consulta usa parámetros con tipos `mssql` (`DateTime`, `NVarChar`, `TinyInt`, `Int`) para evitar inyección SQL.
- El rango fecha+hora aplica sobre `FechaEntrada + HoraEntrada` (combinados a `datetime`).
- Las exportaciones (Excel, PDF) se hacen en el navegador con `xlsx` y `jspdf` cargados dinámicamente para no inflar el bundle inicial.
