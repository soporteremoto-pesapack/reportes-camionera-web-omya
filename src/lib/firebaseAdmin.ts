import {
  cert,
  getApp,
  getApps,
  initializeApp,
  type App,
} from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

export class FirebaseConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FirebaseConfigError";
  }
}

export interface FirebaseAdminConfig {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

export function getFirebaseAdminConfig(): FirebaseAdminConfig {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawKey = process.env.FIREBASE_PRIVATE_KEY;
  if (!projectId || !clientEmail || !rawKey) {
    throw new FirebaseConfigError(
      "Faltan variables FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL o FIREBASE_PRIVATE_KEY",
    );
  }
  // Las private keys se guardan con \n escapados en .env; hay que convertirlos a saltos reales.
  const privateKey = rawKey.replace(/\\n/g, "\n");
  return { projectId, clientEmail, privateKey };
}

export function isFirebaseConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY,
  );
}

const APP_NAME = "reportes-camionera-admin";

function getAdminApp(): App {
  const existing = getApps().find((a) => a.name === APP_NAME);
  if (existing) return existing;
  const cfg = getFirebaseAdminConfig();
  return initializeApp(
    {
      credential: cert({
        projectId: cfg.projectId,
        clientEmail: cfg.clientEmail,
        privateKey: cfg.privateKey,
      }),
    },
    APP_NAME,
  );
}

export function getAdminFirestore(): Firestore {
  return getFirestore(getAdminApp());
}

// Re-export para evitar imports duplicados desde otros archivos.
export { getApp };
