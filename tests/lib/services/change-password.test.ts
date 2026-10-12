import { describe, expect, it, vi } from "vitest"
import type { AdminRow, PatientRow } from "@/lib/repos/types"
import { createChangeAdminPassword, createChangePatientPassword } from "@/lib/services/change-password"

const hashPassword = vi.fn(async (password: string) => `hash:${password}`)
const verifyPassword = async (password: string, stored: string) => stored === `hash:${password}`

const patient: PatientRow = {
  id: "patient-1",
  name: "Ana Souza",
  cpf: "52998224725",
  email: "ana@gmail.com",
  phone: "11987654321",
  passwordHash: "hash:senha-atual",
  mustChangePassword: true,
  createdAt: new Date("2026-10-12T12:00:00Z"),
}

function setupPatient(found: PatientRow | null = patient) {
  const patients = {
    getById: vi.fn(async (_id: string) => found),
    setPassword: vi.fn(async (_id: string, _d: { passwordHash: string; mustChangePassword: boolean }) => true),
  }
  return { patients, change: createChangePatientPassword({ patients, hashPassword, verifyPassword }) }
}

describe("changePatientPassword", () => {
  it("paciente inexistente (sessão de quem foi excluído) → not_found", async () => {
    const s = setupPatient(null)
    expect(await s.change("patient-1", { currentPassword: "senha-atual", newPassword: "senha-nova-123" })).toBe("not_found")
    expect(s.patients.setPassword).not.toHaveBeenCalled()
  })

  it("senha atual errada → wrong_current, sem gravar", async () => {
    const s = setupPatient()
    expect(await s.change("patient-1", { currentPassword: "errada", newPassword: "senha-nova-123" })).toBe("wrong_current")
    expect(s.patients.setPassword).not.toHaveBeenCalled()
  })

  it.each([
    ["7 caracteres", "x".repeat(7)],
    ["201 caracteres", "x".repeat(201)],
    ["não é texto", 12345678],
  ])("senha nova com %s → invalid_new", async (_name, newPassword) => {
    const s = setupPatient()
    expect(await s.change("patient-1", { currentPassword: "senha-atual", newPassword })).toBe("invalid_new")
    expect(s.patients.setPassword).not.toHaveBeenCalled()
  })

  it("paciente sem senha gravada nunca confere a senha atual", async () => {
    const s = setupPatient({ ...patient, passwordHash: null })
    expect(await s.change("patient-1", { currentPassword: "qualquer", newPassword: "senha-nova-123" })).toBe("wrong_current")
  })

  it("sucesso grava o hash novo e zera a troca obrigatória", async () => {
    const s = setupPatient()

    expect(await s.change("patient-1", { currentPassword: "senha-atual", newPassword: "senha-nova-123" })).toBe("ok")

    expect(s.patients.setPassword).toHaveBeenCalledWith("patient-1", {
      passwordHash: "hash:senha-nova-123",
      mustChangePassword: false,
    })
  })
})

describe("changeAdminPassword", () => {
  const admin: AdminRow = { id: "admin-1", name: "Tâmili", email: "admin@plana.com", passwordHash: "hash:senha-atual" }

  function setupAdmin(found: AdminRow | null = admin) {
    const admins = {
      getById: vi.fn(async (_id: string) => found),
      setPassword: vi.fn(async (_id: string, _hash: string) => true),
    }
    return { admins, change: createChangeAdminPassword({ admins, hashPassword, verifyPassword }) }
  }

  it("admin inexistente → not_found", async () => {
    expect(
      await setupAdmin(null).change("admin-1", { currentPassword: "senha-atual", newPassword: "senha-nova-123" }),
    ).toBe("not_found")
  })

  it("senha atual errada → wrong_current", async () => {
    const s = setupAdmin()
    expect(await s.change("admin-1", { currentPassword: "errada", newPassword: "senha-nova-123" })).toBe("wrong_current")
    expect(s.admins.setPassword).not.toHaveBeenCalled()
  })

  it("senha nova com 7 ou 201 caracteres → invalid_new", async () => {
    const s = setupAdmin()
    expect(await s.change("admin-1", { currentPassword: "senha-atual", newPassword: "x".repeat(7) })).toBe("invalid_new")
    expect(await s.change("admin-1", { currentPassword: "senha-atual", newPassword: "x".repeat(201) })).toBe("invalid_new")
  })

  it("sucesso grava o hash novo", async () => {
    const s = setupAdmin()
    expect(await s.change("admin-1", { currentPassword: "senha-atual", newPassword: "senha-nova-123" })).toBe("ok")
    expect(s.admins.setPassword).toHaveBeenCalledWith("admin-1", "hash:senha-nova-123")
  })
})
