import { cookies } from "next/headers"
import { getEnv } from "@/lib/env"
import { SESSION_COOKIE, SESSION_MAX_AGE_S, signSession, verifySessionToken, type Session } from "./session-token"

/** Emite o cookie de sessão (httpOnly, 7 dias). */
export async function createSession(session: Session): Promise<void> {
  const token = await signSession(session, getEnv().SESSION_SECRET)
  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_S,
    path: "/",
  })
}

/** A sessão do cookie da requisição, ou `null`. Nunca lança. */
export async function getSession(): Promise<Session | null> {
  try {
    const store = await cookies()
    return await verifySessionToken(store.get(SESSION_COOKIE)?.value, getEnv().SESSION_SECRET)
  } catch {
    return null
  }
}

export async function destroySession(): Promise<void> {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}
