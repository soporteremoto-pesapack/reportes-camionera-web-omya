import { config } from "dotenv";
config({ path: ".env.local" });
import sql from "mssql";

async function buildSqlConfig() {
  const server = process.env.SQL_SERVER ?? "localhost";
  const portRaw = process.env.SQL_PORT;
  const instance = process.env.SQL_INSTANCE;
  const database = process.env.SQL_DATABASE ?? "DOSIPACK_CAMIONERA_OMYA";
  const user = process.env.SQL_USER ?? "DosiAdmin";
  const password = process.env.SQL_PASSWORD ?? "BACKFRONTFLIP";
  const encrypt = (process.env.SQL_ENCRYPT ?? "false").toLowerCase() === "true";
  const trust = (process.env.SQL_TRUST_SERVER_CERTIFICATE ?? "true").toLowerCase() === "true";

  const cfg: sql.config = {
    server,
    database,
    user,
    password,
    options: {
      encrypt,
      trustServerCertificate: trust,
      ...(instance ? { instanceName: instance } : {}),
    },
    requestTimeout: 60000,
    connectionTimeout: 30000,
  };
  if (portRaw) {
    const port = Number(portRaw);
    if (!Number.isNaN(port)) cfg.port = port;
  }
  return cfg;
}

async function main() {
  console.log("Conectando a SQL Server...");
  const pool = await sql.connect(await buildSqlConfig());
  try {
    console.log("Actualizando Reportado = 0...");
    const result = await pool.request().query(`
      UPDATE dbo.Movimientos
      SET Reportado = 0
      WHERE EstadoMovimiento IN (1, 2, 99)
    `);
    console.log(`Filas actualizadas: ${result.rowsAffected[0]}`);
  } finally {
    await pool.close();
    console.log("Conexión cerrada.");
  }
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
