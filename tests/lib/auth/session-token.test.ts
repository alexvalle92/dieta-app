import { SignJWT } from "jose"
import { describe, expect, it } from "vitest"
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_S,
  signSession,
  verifySessionToken,
  type Session,
} from "@/lib/auth/session-token"

const SECRET = "s".repeat(32)
const patient: Session = {
  userId: "11111111-1111-4111-8111-111111111111",
  userType: "patient",
  name: "Ana Souza",
  email: "ana@example.com",
  mustChangePassword: true,
}

const key = (secret: string) => new TextEncoder().encode(secret)

describe("session-token", () => {
  it("expõe o nome do cookie e a duração de 7 dias", () => {
    expect(SESSION_COOKIE).toBe("plana_session")
    expect(SESSION_MAX_AGE_S).toBe(604800)
  })

  it("assina e lê de volta os cinco campos", async () => {
    const token = await signSession(patient, SECRET)
    expect(await verifySessionToken(token, SECRET)).toEqual(patient)
  })

  it("admin volta como admin e sem troca pendente", async () => {
    const admin: Session = { ...patient, userType: "admin", mustChangePassword: false }
    expect(await verifySessionToken(await signSession(admin, SECRET), SECRET)).toEqual(admin)
  })

  it.each([undefined, "", "abc", "a.b.c"])("token %j → null", async (token) => {
    expect(await verifySessionToken(token, SECRET)).toBeNull()
  })

  it("token adulterado → null", async () => {
    const token = await signSession(patient, SECRET)
    const tampered = token.slice(0, -2) + (token.endsWith("AA") ? "BB" : "AA")
    expect(await verifySessionToken(tampered, SECRET)).toBeNull()
  })

  it("segredo diferente → null", async () => {
    const token = await signSession(patient, SECRET)
    expect(await verifySessionToken(token, "o".repeat(32))).toBeNull()
  })

  it("segredo vazio → null na leitura", async () => {
    const token = await signSession(patient, SECRET)
    expect(await verifySessionToken(token, "")).toBeNull()
  })

  it("token vencido → null", async () => {
    const expired = await new SignJWT({ type: "patient", name: "A", email: "a@b.co", mcp: false })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(patient.userId)
      .setIssuedAt(Math.floor(Date.now() / 1000) - 7200)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 3600)
      .sign(key(SECRET))
    expect(await verifySessionToken(expired, SECRET)).toBeNull()
  })

  it("token sem tipo de usuário → null", async () => {
    const noType = await new SignJWT({ name: "A", email: "a@b.co", mcp: false })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(patient.userId)
      .setExpirationTime("7d")
      .sign(key(SECRET))
    expect(await verifySessionToken(noType, SECRET)).toBeNull()
  })

  it("token com tipo desconhecido → null", async () => {
    const odd = await new SignJWT({ type: "root", name: "A", email: "a@b.co", mcp: false })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(patient.userId)
      .setExpirationTime("7d")
      .sign(key(SECRET))
    expect(await verifySessionToken(odd, SECRET)).toBeNull()
  })

  it("assinar com segredo vazio lança (nunca emite token fraco)", async () => {
    await expect(signSession(patient, "")).rejects.toThrow()
  })
})
