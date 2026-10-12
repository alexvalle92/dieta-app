import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { signSession, type Session } from "@/lib/auth/session-token"
import { middleware } from "@/middleware"

const SECRET = "s".repeat(32)

const patient: Session = {
  userId: "patient-1",
  userType: "patient",
  name: "Ana Souza",
  email: "ana@example.com",
  mustChangePassword: false,
}
const admin: Session = { ...patient, userId: "admin-1", userType: "admin" }

async function call(path: string, session?: Session) {
  const headers: Record<string, string> = {}
  if (session) headers.cookie = `plana_session=${await signSession(session, SECRET)}`
  return middleware(new NextRequest(`http://localhost${path}`, { headers }))
}

const redirectsTo = (response: Response, path: string) => {
  expect(response.status).toBe(307)
  expect(new URL(response.headers.get("location")!).pathname).toBe(path)
}
const passes = (response: Response) => {
  expect(response.headers.get("x-middleware-next")).toBe("1")
}

describe("middleware", () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = SECRET
  })
  afterEach(() => {
    delete process.env.SESSION_SECRET
  })

  it("/cliente sem sessão → login do cliente; /admin sem sessão → login do admin", async () => {
    redirectsTo(await call("/cliente/dashboard"), "/cliente/login")
    redirectsTo(await call("/admin/dashboard"), "/admin/login")
  })

  it("/cliente sem sessão leva o destino em `next`; /admin e a troca de senha não levam", async () => {
    const toClientLogin = await call("/cliente/planos/abc/renovar")
    redirectsTo(toClientLogin, "/cliente/login")
    expect(new URL(toClientLogin.headers.get("location")!).searchParams.get("next")).toBe(
      "/cliente/planos/abc/renovar",
    )

    const toAdminLogin = await call("/admin/pacientes")
    redirectsTo(toAdminLogin, "/admin/login")
    expect(new URL(toAdminLogin.headers.get("location")!).searchParams.has("next")).toBe(false)

    const toChangePassword = await call("/cliente/planos/abc/renovar", { ...patient, mustChangePassword: true })
    redirectsTo(toChangePassword, "/cliente/recuperar-senha")
    expect(new URL(toChangePassword.headers.get("location")!).searchParams.has("next")).toBe(false)
  })

  it.each(["/cliente/login", "/cliente/esqueci-senha", "/cliente/redefinir-senha/abc", "/admin/login"])(
    "%s é público",
    async (path) => {
      passes(await call(path))
    },
  )

  it("paciente com sessão entra nas páginas do cliente", async () => {
    passes(await call("/cliente/planos", patient))
  })

  it("paciente com a troca pendente é levado a /cliente/recuperar-senha, e lá fica", async () => {
    const pending: Session = { ...patient, mustChangePassword: true }

    redirectsTo(await call("/cliente/planos", pending), "/cliente/recuperar-senha")
    redirectsTo(await call("/cliente/dashboard", pending), "/cliente/recuperar-senha")
    passes(await call("/cliente/recuperar-senha", pending))
  })

  it("a troca pendente não vale para o admin", async () => {
    passes(await call("/admin/dashboard", { ...admin, mustChangePassword: true }))
  })

  it("paciente em /admin → login do admin; admin em /cliente → login do cliente", async () => {
    redirectsTo(await call("/admin/dashboard", patient), "/admin/login")
    redirectsTo(await call("/cliente/dashboard", admin), "/cliente/login")
  })

  it("cookie adulterado conta como sem sessão", async () => {
    const response = await middleware(
      new NextRequest("http://localhost/cliente/dashboard", { headers: { cookie: "plana_session=abc.def.ghi" } }),
    )
    redirectsTo(response, "/cliente/login")
  })

  it("SESSION_SECRET ausente → trata como sem sessão", async () => {
    const token = await signSession(patient, SECRET)
    delete process.env.SESSION_SECRET

    const response = await middleware(
      new NextRequest("http://localhost/cliente/dashboard", { headers: { cookie: `plana_session=${token}` } }),
    )
    redirectsTo(response, "/cliente/login")
  })
})
