import sql, { type ConnectionPool, type config as SqlConfig } from "mssql";

declare global {
  // eslint-disable-next-line no-var
  var __sqlPool: Promise<ConnectionPool> | undefined;
}

function buildConfig(): SqlConfig {
  const server = process.env.SQL_SERVER ?? "localhost";
  const portRaw = process.env.SQL_PORT;
  const instance = process.env.SQL_INSTANCE;
  const database = process.env.SQL_DATABASE ?? "DOSIPACK_CAMIONERA_OMYA";
  const user = process.env.SQL_USER ?? "DosiAdmin";
  const password = process.env.SQL_PASSWORD ?? "BACKFRONTFLIP";
  const encrypt = (process.env.SQL_ENCRYPT ?? "false").toLowerCase() === "true";
  const trustServerCertificate =
    (process.env.SQL_TRUST_SERVER_CERTIFICATE ?? "true").toLowerCase() === "true";

  const config: SqlConfig = {
    server,
    database,
    user,
    password,
    options: {
      encrypt,
      trustServerCertificate,
      ...(instance ? { instanceName: instance } : {}),
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30_000,
    },
    requestTimeout: 60_000,
  };

  if (portRaw) {
    const port = Number(portRaw);
    if (!Number.isNaN(port)) config.port = port;
  }

  return config;
}

export function getPool(): Promise<ConnectionPool> {
  if (!global.__sqlPool) {
    global.__sqlPool = sql.connect(buildConfig()).catch((err) => {
      global.__sqlPool = undefined;
      throw err;
    });
  }
  return global.__sqlPool;
}

export { sql };
