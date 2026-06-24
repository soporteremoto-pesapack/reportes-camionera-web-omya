// Autenticación simple por contraseña (sin usuario) para restringir el acceso
// a toda la app. Funciona tanto en el runtime Edge (middleware) como en Node
// (server actions) porque usa Web Crypto (`crypto.subtle`), disponible en ambos.

export const AUTH_COOKIE = "rcw_auth";

// Duración de la sesión: 12 horas.
export const SESSION_MAX_AGE = 60 * 60 * 12;

function getSecret(): string {
  // AUTH_SECRET permite invalidar todas las sesiones sin cambiar la contraseña.
  // Si no está definido, se deriva de la contraseña (cambiarla cierra sesiones).
  return (
    process.env.AUTH_SECRET ||
    process.env.APP_PASSWORD ||
    "rcw-secret-sin-configurar"
  );
}

export function getAppPassword(): string {
  return process.env.APP_PASSWORD ?? "";
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Token opaco de sesión: solo el servidor puede generarlo (depende del secreto).
// El middleware recalcula este mismo valor y lo compara con la cookie.
export async function sessionToken(): Promise<string> {
  return sha256Hex(`rcw-session::${getSecret()}`);
}

// Comparación en tiempo (casi) constante para no filtrar la contraseña por timing.
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
