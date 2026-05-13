# Contexto de la Aplicación: Reportes Camionera Dosipack — Omya Río Claro

## Resumen del Proyecto
Esta aplicación es un dashboard web desarrollado con **Next.js 15** diseñado para visualizar, filtrar y exportar movimientos de pesaje de básculas camioneras para la empresa Omya Río Claro. El sistema está diseñado para ser resiliente, operando principalmente contra un **SQL Server** local y utilizando **Firebase Firestore** como respaldo automático en caso de pérdida de conexión.

## Arquitectura Técnica
- **Frontend**: React 18, Tailwind CSS, shadcn/ui.
- **Backend**: Next.js App Router (Server Actions).
- **Base de Datos Principal**: SQL Server (`DOSIPACK_CAMIONERA_OMYA`, tabla `dbo.Movimientos`).
- **Base de Datos de Respaldo**: Firebase Firestore.
- **Sincronización**: Un script de Node.js (`sync-cloud.ts`) replica los últimos 2000 movimientos desde SQL Server a Firestore cada 15 minutos (programado mediante Tareas de Windows).

## Estructura de Archivos Clave
- `src/app/page.tsx`: Punto de entrada principal que contiene el layout y el dashboard.
- `src/components/movimientos-dashboard.tsx`: El componente núcleo que maneja los filtros, la tabla de datos, los KPIs y los gráficos (usando `recharts`).
- `src/app/actions.ts`: Contiene la lógica de Server Action para consultar movimientos, implementando el fallback automático de SQL Server a Firestore.
- `src/services/movimientosService.ts`: Servicio encargado de las consultas a SQL Server usando el paquete `mssql`.
- `src/services/movimientosFirestoreService.ts`: Servicio encargado de las consultas a Firebase Firestore.
- `src/lib/db.ts`: Configuración del pool de conexión a SQL Server.
- `src/lib/firebaseAdmin.ts`: Inicialización del SDK de Firebase Admin para acceso a Firestore.
- `src/lib/types.ts`: Definiciones de interfaces (e.g., `Movimiento`, `MovimientoFilter`) y etiquetas de traducción/mapeo.

## Funcionalidades Principales
1. **Consulta con Filtros**: Rango de fecha/hora, placa (LIKE), estado del movimiento (1:Incompleto, 2:Completo, 99:Eliminado) y tipo de proceso (0:Entrada, 1:Salida).
2. **Dashboard de KPIs**: Visualización rápida del total de movimientos, peso acumulado y peso promedio.
3. **Gráficos**: Visualización de la distribución de peso total por día.
4. **Exportación**: Generación de reportes en formatos **Excel (.xlsx)** y **PDF** directamente desde el navegador.
5. **Modo Offline**: Detección automática de desconexión del servidor local y cambio transparente a los datos en la nube.

## Estado del Repositorio
- Git inicializado.
- Commit inicial realizado con el estado actual del código.
- Configuración de entorno manejada mediante `.env.local` (no incluido en el repositorio).
