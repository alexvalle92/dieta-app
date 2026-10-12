import { describe, expect, it, vi } from "vitest"
import { verifyPassword } from "@/lib/auth/password-hash"
import type { PatientRepo, PatientRow } from "@/lib/repos/types"
import { createPatientAdmin } from "@/lib/services/patient-admin"

const row = (over: Partial<PatientRow> = {}): PatientRow => ({
  id: "patient-1",
  name: "Ana Souza",
  cpf: "52998224725",
  email: "ana@gmail.com",
  phone: "11987654321",
  passwordHash: "hash",
  mustChangePassword: true,
  createdAt: new Date("2026-10-12T12:00:00Z"),
  ...over,
})

const hashPassword = async (password: string) => `hash:${password}`

function setup(over: Partial<PatientRepo> = {}) {
  const patients = {
    create: vi.fn(async (d: Parameters<PatientRepo["create"]>[0]) => row({ ...d, id: "new-1" })),
    update: vi.fn(async (id: string, d: Parameters<PatientRepo["update"]>[1]) => row({ id, ...d })),
    delete: vi.fn(async (_id: string) => "deleted" as const),
    setPassword: vi.fn(async (_id: string, _d: { passwordHash: string; mustChangePassword: boolean }) => true),
    ...over,
  } as unknown as PatientRepo & Record<string, ReturnType<typeof vi.fn>>
  return { patients, admin: createPatientAdmin({ patients, hashPassword }) }
}

const valid = {
  name: "Ana Souza",
  cpf: "529.982.247-25",
  email: "Ana@Gmail.com",
  phone: "(11) 98765-4321",
  password: "senha-segura-123",
}

describe("patientAdmin.create", () => {
  it.each([
    ["sem nome", { name: "  " }],
    ["sem CPF", { cpf: "" }],
    ["sem e-mail", { email: undefined }],
    ["sem senha", { password: "" }],
    ["nome que não é texto", { name: 123 }],
  ])("%s → missing_fields", async (_name, override) => {
    const s = setup()
    expect(await s.admin.create({ ...valid, ...override })).toEqual({ ok: false, reason: "missing_fields" })
    expect(s.patients.create).not.toHaveBeenCalled()
  })

  it("CPF 111.111.111-11 → invalid_cpf", async () => {
    expect(await setup().admin.create({ ...valid, cpf: "111.111.111-11" })).toEqual({ ok: false, reason: "invalid_cpf" })
  })

  it("e-mail inválido → invalid_email", async () => {
    expect(await setup().admin.create({ ...valid, email: "x" })).toEqual({ ok: false, reason: "invalid_email" })
  })

  it("senha com 7 ou 201 caracteres → invalid_password", async () => {
    const s = setup()
    expect(await s.admin.create({ ...valid, password: "x".repeat(7) })).toEqual({ ok: false, reason: "invalid_password" })
    expect(await s.admin.create({ ...valid, password: "x".repeat(201) })).toEqual({ ok: false, reason: "invalid_password" })
  })

  it("nome com mais de 200 caracteres → invalid_name", async () => {
    expect(await setup().admin.create({ ...valid, name: "A".repeat(201) })).toEqual({ ok: false, reason: "invalid_name" })
  })

  it("o repositório devolve cpf_taken → cpf_taken", async () => {
    const s = setup({ create: vi.fn(async () => "cpf_taken" as const) })
    expect(await s.admin.create(valid)).toEqual({ ok: false, reason: "cpf_taken" })
  })

  it("sucesso grava CPF só com dígitos, e-mail em minúsculas, telefone só com dígitos e o hash da senha", async () => {
    const s = setup()

    const result = await s.admin.create(valid)

    expect(s.patients.create).toHaveBeenCalledWith({
      name: "Ana Souza",
      cpf: "52998224725",
      email: "ana@gmail.com",
      phone: "11987654321",
      passwordHash: "hash:senha-segura-123",
    })
    expect(result.ok).toBe(true)
  })

  it("o hash gravado confere com a senha (scrypt de verdade)", async () => {
    const { hashPassword: realHash } = await import("@/lib/auth/password-hash")
    const patients = {
      create: vi.fn(async (d: Parameters<PatientRepo["create"]>[0]) => row({ ...d })),
    } as unknown as PatientRepo
    const admin = createPatientAdmin({ patients, hashPassword: realHash })

    await admin.create(valid)

    const stored = (patients.create as ReturnType<typeof vi.fn>).mock.calls[0][0].passwordHash as string
    expect(await verifyPassword(valid.password, stored)).toBe(true)
  })

  it("telefone ausente vira vazio", async () => {
    const s = setup()
    await s.admin.create({ ...valid, phone: undefined })
    expect((s.patients.create as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0].phone).toBe("")
  })
})

describe("patientAdmin.update", () => {
  it("id inexistente → not_found", async () => {
    const s = setup({ update: vi.fn(async () => null) })
    expect(await s.admin.update("x", { name: "Ana", email: "ana@gmail.com" })).toBe("not_found")
  })

  it("sem nome ou sem e-mail → missing_fields; e-mail inválido → invalid_email", async () => {
    const s = setup()
    expect(await s.admin.update("x", { name: "", email: "ana@gmail.com" })).toBe("missing_fields")
    expect(await s.admin.update("x", { name: "Ana", email: "" })).toBe("missing_fields")
    expect(await s.admin.update("x", { name: "Ana", email: "invalido" })).toBe("invalid_email")
    expect(s.patients.update).not.toHaveBeenCalled()
  })

  it("sucesso normaliza e-mail e telefone", async () => {
    const s = setup()

    const result = await s.admin.update("patient-1", { name: " Ana Maria ", email: "ANA@Gmail.com", phone: "(11) 98765-4321" })

    expect(s.patients.update).toHaveBeenCalledWith("patient-1", {
      name: "Ana Maria",
      email: "ana@gmail.com",
      phone: "11987654321",
    })
    expect(result).toMatchObject({ id: "patient-1", name: "Ana Maria" })
  })
})

describe("patientAdmin.remove", () => {
  it.each(["deleted", "not_found", "has_history"] as const)("repassa %s do repositório", async (outcome) => {
    const s = setup({ delete: vi.fn(async () => outcome) })
    expect(await s.admin.remove("patient-1")).toBe(outcome)
  })
})

describe("patientAdmin.resetPassword", () => {
  it("senha com 7 ou 201 caracteres → invalid_password, sem gravar", async () => {
    const s = setup()
    expect(await s.admin.resetPassword("patient-1", "x".repeat(7))).toBe("invalid_password")
    expect(await s.admin.resetPassword("patient-1", "x".repeat(201))).toBe("invalid_password")
    expect(await s.admin.resetPassword("patient-1", 12345678)).toBe("invalid_password")
    expect(s.patients.setPassword).not.toHaveBeenCalled()
  })

  it("id inexistente → not_found", async () => {
    const s = setup({ setPassword: vi.fn(async () => false) })
    expect(await s.admin.resetPassword("x", "senha-nova-123")).toBe("not_found")
  })

  it("sucesso grava o hash e marca a troca obrigatória", async () => {
    const s = setup()

    expect(await s.admin.resetPassword("patient-1", "senha-nova-123")).toBe("ok")

    expect(s.patients.setPassword).toHaveBeenCalledWith("patient-1", {
      passwordHash: "hash:senha-nova-123",
      mustChangePassword: true,
    })
  })
})
