"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  AUTH_COOKIE,
  SESSION_MAX_AGE,
  getAppPassword,
  safeEqual,
  sessionToken,
} from "@/lib/auth";

export interface LoginState {
  error: string | null;
}

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  const expected = getAppPassword();

  if (!expected) {
    return {
      error:
        "El acceso no está configurado. Define APP_PASSWORD en el servidor.",
    };
  }

  if (!password || !safeEqual(password, expected)) {
    return { error: "Contraseña incorrecta. Inténtalo de nuevo." };
  }

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, await sessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  redirect("/");
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE);
  redirect("/login");
}
