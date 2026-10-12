import { describe, expect, it, vi } from "vitest"
import type { Channel, PatientRow } from "@/lib/repos/types"
import {
  RESET_TOKEN_TTL_MS,
  createRedeemPasswordReset,
  createRequestPasswordReset,
} from "@/lib/services/password-reset"

const NOW = new Date("2026-10-12T15:00:00.000Z")
const APP_URL = "https://plana.test"

const patient = (over: Partial<PatientRow> = {}): PatientRow => ({
  id: "patient-1",
  name: "Ana Souza",
  cpf: "52998224725",
  email: "ana@gmail.com",
  phone: "11987654321",
  passwordHash: "hash",
  mustChangePassword: false,
  createdAt: NOW,
  ...over,
})

type CreateRequestArg = Parameters<Parameters<typeof createRequestPasswordReset>[0]["resetTokens"]["createRequest"]>[0]

function setupRequest(
  over: { found?: PatientRow | null; channels?: Channel[]; appUrl?: string } = {},
) {
  const patients = { findByCpf: vi.fn(async (_cpf: string) => (over.found === undefined ? patient() : over.found)) }
  const resetTokens = {
    createRequest: vi.fn(async (d: CreateRequestArg) => ({ notificationIds: d.recipients.map((_, i) => `n-${i}`) })),
  }
  const request = createRequestPasswordReset({
    patients,
    resetTokens,
    newToken: () => ({ token: "tok_abc", hash: "h".repeat(64) }),
    now: () => NOW,
    appUrl: over.appUrl ?? APP_URL,
    channels: over.channels ?? ["email", "whatsapp"],
  })
  return { patients, resetTokens, request }
}

describe("requestPasswordReset", () => {
  it("CPF de formato inválido → invalid_cpf, sem consultar o banco", async () => {
    const s = setupRequest()
    expect(await s.request("123")).toEqual({ kind: "invalid_cpf" })
    expect(await s.request(undefined)).toEqual({ kind: "invalid_cpf" })
    expect(s.patients.findByCpf).not.toHaveBeenCalled()
  })

  it("CPF válido sem paciente → not_found", async () => {
    const s = setupRequest({ found: null })
    expect(await s.request("529.982.247-25")).toEqual({ kind: "not_found" })
    expect(s.resetTokens.createRequest).not.toHaveBeenCalled()
  })

  it("sucesso com os dois canais: token, validade de 1 hora, link e destinatários", async () => {
    const s = setupRequest()

    const result = await s.request("529.982.247-25")

    expect(s.patients.findByCpf).toHaveBeenCalledWith("52998224725")
    expect(RESET_TOKEN_TTL_MS).toBe(3_600_000)
    expect(s.resetTokens.createRequest).toHaveBeenCalledWith({
      patientId: "patient-1",
      tokenHash: "h".repeat(64),
      expiresAt: new Date(NOW.getTime() + 3_600_000),
      link: "https://plana.test/cliente/redefinir-senha/tok_abc",
      recipients: [
        { channel: "email", recipient: "ana@gmail.com" },
        { channel: "whatsapp", recipient: "5511987654321" },
      ],
      now: NOW,
    })
    expect(result).toEqual({ kind: "sent", maskedEmail: "a***@gmail.com", notificationIds: ["n-0", "n-1"] })
  })

  it("appUrl terminado em / não gera // no link", async () => {
    const s = setupRequest({ appUrl: "https://plana.test/" })
    await s.request("52998224725")
    expect(s.resetTokens.createRequest.mock.calls[0][0].link).toBe("https://plana.test/cliente/redefinir-senha/tok_abc")
  })

  it("só o canal de e-mail ligado → só o destinatário de e-mail", async () => {
    const s = setupRequest({ channels: ["email"] })
    await s.request("52998224725")
    expect(s.resetTokens.createRequest.mock.calls[0][0].recipients).toEqual([
      { channel: "email", recipient: "ana@gmail.com" },
    ])
  })

  it("paciente sem telefone → só e-mail, mesmo com o WhatsApp ligado", async () => {
    const s = setupRequest({ found: patient({ phone: "" }) })
    await s.request("52998224725")
    expect(s.resetTokens.createRequest.mock.calls[0][0].recipients).toEqual([
      { channel: "email", recipient: "ana@gmail.com" },
    ])
  })
})

describe("redeemPasswordReset", () => {
  function setupRedeem(result: "ok" | "invalid" | "expired" = "ok") {
    const resetTokens = { redeem: vi.fn(async (_d: { tokenHash: string; passwordHash: string; now: Date }) => result) }
    const hashPassword = vi.fn(async (p: string) => `hash:${p}`)
    const redeem = createRedeemPasswordReset({
      resetTokens,
      hashPassword,
      hashToken: (token) => `sha:${token}`,
      now: () => NOW,
    })
    return { resetTokens, hashPassword, redeem }
  }

  it("senha nova com 7 ou 201 caracteres → invalid_new, sem tocar no repositório", async () => {
    const s = setupRedeem()
    expect(await s.redeem({ token: "tok", newPassword: "x".repeat(7) })).toBe("invalid_new")
    expect(await s.redeem({ token: "tok", newPassword: "x".repeat(201) })).toBe("invalid_new")
    expect(s.resetTokens.redeem).not.toHaveBeenCalled()
  })

  it("token ausente ou vazio → invalid", async () => {
    const s = setupRedeem()
    expect(await s.redeem({ newPassword: "senha-nova-123" })).toBe("invalid")
    expect(await s.redeem({ token: "", newPassword: "senha-nova-123" })).toBe("invalid")
    expect(s.resetTokens.redeem).not.toHaveBeenCalled()
  })

  it("chama o repositório com o hash do token e o hash da senha nova", async () => {
    const s = setupRedeem("ok")

    expect(await s.redeem({ token: "tok_abc", newPassword: "senha-nova-123" })).toBe("ok")

    expect(s.resetTokens.redeem).toHaveBeenCalledWith({
      tokenHash: "sha:tok_abc",
      passwordHash: "hash:senha-nova-123",
      now: NOW,
    })
  })

  it.each(["invalid", "expired"] as const)("repassa %s do repositório", async (outcome) => {
    expect(await setupRedeem(outcome).redeem({ token: "tok", newPassword: "senha-nova-123" })).toBe(outcome)
  })
})
