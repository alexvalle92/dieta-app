import { describe, expect, it } from "vitest"
import { checkSession } from "@/lib/auth/guards"
import type { Session } from "@/lib/auth/session-token"

const patient: Session = {
  userId: "patient-1",
  userType: "patient",
  name: "Ana Souza",
  email: "ana@example.com",
  mustChangePassword: false,
}
const admin: Session = { ...patient, userId: "admin-1", userType: "admin" }

async function refusal(result: ReturnType<typeof checkSession>) {
  if (result.ok) throw new Error("esperava recusa")
  return { status: result.response.status, body: await result.response.json() }
}

describe("checkSession", () => {
  it.each(["admin", "patient"] as const)("sem sessão → 401 para %s", async (want) => {
    expect(await refusal(checkSession(null, want))).toEqual({
      status: 401,
      body: { error: "Acesso não autorizado" },
    })
  })

  it("sessão de paciente pedindo admin, e de admin pedindo paciente → 401", async () => {
    expect((await refusal(checkSession(patient, "admin"))).status).toBe(401)
    expect((await refusal(checkSession(admin, "patient"))).status).toBe(401)
  })

  it("sessão do tipo certo → ok com a sessão", () => {
    expect(checkSession(admin, "admin")).toEqual({ ok: true, session: admin })
    expect(checkSession(patient, "patient")).toEqual({ ok: true, session: patient })
  })

  it("paciente com a troca de senha pendente → 403 com o código, e ok quando a rota permite", async () => {
    const pending: Session = { ...patient, mustChangePassword: true }

    expect(await refusal(checkSession(pending, "patient"))).toEqual({
      status: 403,
      body: { error: "Troque sua senha para continuar", code: "password_change_required" },
    })
    expect(checkSession(pending, "patient", { allowPendingPasswordChange: true })).toEqual({
      ok: true,
      session: pending,
    })
  })

  it("a troca pendente não afeta o admin", () => {
    expect(checkSession({ ...admin, mustChangePassword: true }, "admin").ok).toBe(true)
  })
})
