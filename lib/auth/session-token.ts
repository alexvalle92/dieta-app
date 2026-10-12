import { SignJWT, jwtVerify } from "jose"

// Só `jose`, sem `next/headers`: o `middleware.ts` importa este módulo.

export type Session = {
  userId: string
  userType: "patient" | "admin"
  name: string
  email: string
  /** Paciente com a senha temporária ainda não trocada (§6.5 do spec). */
  mustChangePassword: boolean
}

export const SESSION_COOKIE = "plana_session"
export const SESSION_MAX_AGE_S = 60 * 60 * 24 * 7

const encodeKey = (secret: string) => new TextEncoder().encode(secret)

/** JWT HS256 com os campos da sessão. Segredo vazio lança: nunca emite um token fraco. */
export async function signSession(session: Session, secret: string): Promise<string> {
  if (!secret) throw new Error("SESSION_SECRET ausente")
  return new SignJWT({
    type: session.userType,
    name: session.name,
    email: session.email,
    mcp: session.mustChangePassword,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_S}s`)
    .sign(encodeKey(secret))
}

/** A sessão do token, ou `null` se ausente, adulterado, vencido, com outro segredo ou malformado. */
export async function verifySessionToken(token: string | undefined, secret: string): Promise<Session | null> {
  if (!token || !secret) return null
  try {
    const { payload } = await jwtVerify(token, encodeKey(secret), { algorithms: ["HS256"] })
    const type = payload.type
    if (typeof payload.sub !== "string" || (type !== "patient" && type !== "admin")) return null
    return {
      userId: payload.sub,
      userType: type,
      name: typeof payload.name === "string" ? payload.name : "",
      email: typeof payload.email === "string" ? payload.email : "",
      mustChangePassword: payload.mcp === true,
    }
  } catch {
    return null
  }
}
