import { describe, expect, it, vi } from "vitest"
import type { AdminRow, PatientRow } from "@/lib/repos/types"
import { createLoginAdmin, createLoginPatient } from "@/lib/services/login"

const DUMMY = "dummy-hash"

const patient = (over: Partial<PatientRow> = {}): PatientRow => ({
  id: "patient-1",
  name: "Ana Souza",
  cpf: "52998224725",
  email: "ana@gmail.com",
  phone: "11987654321",
  passwordHash: "hash:senha-correta",
  mustChangePassword: false,
  createdAt: new Date("2026-10-12T12:00:00Z"),
  ...over,
})

// `verifyPassword` falso: "hash:<senha>" confere com <senha>.
const verifyPassword = () => vi.fn(async (password: string, stored: string) => stored === `hash:${password}`)

function setupPatient(over: { byCpf?: PatientRow | null; byEmail?: PatientRow[] } = {}) {
  const patients = {
    findByCpf: vi.fn(async (_cpf: string) => (over.byCpf === undefined ? patient() : over.byCpf)),
    findByEmail: vi.fn(async (_email: string) => over.byEmail ?? [patient()]),
  }
  const verify = verifyPassword()
  const login = createLoginPatient({ patients, verifyPassword: verify, dummyHash: DUMMY })
  return { patients, verify, login }
}

describe("loginPatient", () => {
  it("CPF com pontuação e senha certa → sessão do paciente, procurando só pelos dígitos", async () => {
    const s = setupPatient({ byCpf: patient({ mustChangePassword: true }) })

    const result = await s.login({ cpf: "529.982.247-25", password: "senha-correta" })

    expect(s.patients.findByCpf).toHaveBeenCalledWith("52998224725")
    expect(result).toEqual({
      ok: true,
      session: {
        userId: "patient-1",
        userType: "patient",
        name: "Ana Souza",
        email: "ana@gmail.com",
        mustChangePassword: true,
      },
    })
  })

  it("senha errada → recusa", async () => {
    const s = setupPatient()
    expect(await s.login({ cpf: "52998224725", password: "outra-senha" })).toEqual({ ok: false })
  })

  it("CPF inexistente → recusa, ainda verificando a senha contra o hash fixo", async () => {
    const s = setupPatient({ byCpf: null })

    expect(await s.login({ cpf: "52998224725", password: "qualquer-coisa" })).toEqual({ ok: false })
    expect(s.verify).toHaveBeenCalledTimes(1)
    expect(s.verify).toHaveBeenCalledWith("qualquer-coisa", DUMMY)
  })

  it("paciente sem senha (ainda não pagou) → recusa, ainda verificando contra o hash fixo", async () => {
    const s = setupPatient({ byCpf: patient({ passwordHash: null }) })

    expect(await s.login({ cpf: "52998224725", password: "senha-correta" })).toEqual({ ok: false })
    expect(s.verify).toHaveBeenCalledTimes(1)
    expect(s.verify).toHaveBeenCalledWith("senha-correta", DUMMY)
  })

  it("e-mail com maiúsculas e espaços → procura em minúsculas; uma linha e senha certa → entra", async () => {
    const s = setupPatient()

    const result = await s.login({ email: " Ana@Gmail.com ", password: "senha-correta" })

    expect(s.patients.findByEmail).toHaveBeenCalledWith("ana@gmail.com")
    expect(result.ok).toBe(true)
  })

  it("e-mail de duas pacientes → recusa mesmo com a senha de uma delas", async () => {
    const s = setupPatient({ byEmail: [patient(), patient({ id: "patient-2", cpf: "11144477735" })] })
    expect(await s.login({ email: "ana@gmail.com", password: "senha-correta" })).toEqual({ ok: false })
  })

  it("e-mail desconhecido ou malformado → recusa", async () => {
    const s = setupPatient({ byEmail: [] })
    expect(await s.login({ email: "ninguem@gmail.com", password: "senha-correta" })).toEqual({ ok: false })
    expect(await s.login({ email: "sem-arroba", password: "senha-correta" })).toEqual({ ok: false })
  })

  it("senha com 201 caracteres → recusa sem consultar o banco nem calcular o scrypt", async () => {
    const s = setupPatient()

    expect(await s.login({ cpf: "52998224725", password: "x".repeat(201) })).toEqual({ ok: false })

    expect(s.patients.findByCpf).not.toHaveBeenCalled()
    expect(s.verify).not.toHaveBeenCalled()
  })

  it.each([
    ["sem cpf nem e-mail", { password: "senha-correta" }],
    ["senha ausente", { cpf: "52998224725" }],
    ["senha que não é texto", { cpf: "52998224725", password: 12345678 }],
    ["senha vazia", { cpf: "52998224725", password: "" }],
    ["cpf que não é texto", { cpf: 52998224725, password: "senha-correta" }],
  ])("%s → recusa", async (_name, input) => {
    const s = setupPatient()
    expect(await s.login(input)).toEqual({ ok: false })
  })
})

describe("loginAdmin", () => {
  const admin: AdminRow = { id: "admin-1", name: "Tâmili", email: "admin@plana.com", passwordHash: "hash:senha-do-admin" }

  const setupAdmin = (found: AdminRow | null) => {
    const admins = { findByEmail: vi.fn(async (_email: string) => found) }
    const verify = verifyPassword()
    return { admins, verify, login: createLoginAdmin({ admins, verifyPassword: verify, dummyHash: DUMMY }) }
  }

  it("senha certa → sessão do admin, sem troca pendente", async () => {
    const s = setupAdmin(admin)

    const result = await s.login({ email: " Admin@Plana.com", password: "senha-do-admin" })

    expect(s.admins.findByEmail).toHaveBeenCalledWith("admin@plana.com")
    expect(result).toEqual({
      ok: true,
      session: { userId: "admin-1", userType: "admin", name: "Tâmili", email: "admin@plana.com", mustChangePassword: false },
    })
  })

  it("senha errada → recusa", async () => {
    expect(await setupAdmin(admin).login({ email: "admin@plana.com", password: "errada" })).toEqual({ ok: false })
  })

  it("e-mail desconhecido → recusa, verificando contra o hash fixo", async () => {
    const s = setupAdmin(null)

    expect(await s.login({ email: "ninguem@plana.com", password: "qualquer" })).toEqual({ ok: false })
    expect(s.verify).toHaveBeenCalledWith("qualquer", DUMMY)
  })

  it("senha com 201 caracteres ou e-mail ausente → recusa sem consultar o banco", async () => {
    const s = setupAdmin(admin)
    expect(await s.login({ email: "admin@plana.com", password: "x".repeat(201) })).toEqual({ ok: false })
    expect(await s.login({ password: "senha-do-admin" })).toEqual({ ok: false })
    expect(s.admins.findByEmail).not.toHaveBeenCalled()
  })
})
