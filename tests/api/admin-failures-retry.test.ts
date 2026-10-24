import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  retry: vi.fn(),
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock("@/lib/auth/guards", () => ({ requireAdmin: mocks.requireAdmin }))
vi.mock("@/lib/container", () => ({
  getContainer: () => ({ forms: { retry: mocks.retry }, log: mocks.log }),
}))

import { POST } from "@/app/api/admin/failures/retry/route"

const post = (body: unknown) =>
  POST(
    new Request("http://plana/api/admin/failures/retry", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  )

describe("POST /api/admin/failures/retry", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireAdmin.mockResolvedValue({ ok: true, session: { userId: "admin-1", userType: "admin" } })
  })

  it("sem sessão de admin → resposta da guarda e nada é reaberto", async () => {
    mocks.requireAdmin.mockResolvedValue({ ok: false, response: Response.json({ error: "Acesso não autorizado" }, { status: 401 }) })

    const response = await post({ type: "payment", id: "p1" })

    expect(response.status).toBe(401)
    expect(mocks.retry).not.toHaveBeenCalled()
  })

  it("corpo ilegível → 400 e nada é reaberto", async () => {
    const response = await post("não é json")

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: "Pedido inválido" })
    expect(mocks.retry).not.toHaveBeenCalled()
  })

  it("corpo acima de 4 KB → 413", async () => {
    const response = await post({ type: "payment", id: "p1", lixo: "x".repeat(5000) })

    expect(response.status).toBe(413)
    expect(mocks.retry).not.toHaveBeenCalled()
  })

  it.each([{ type: "allFailed", id: "x" }, { type: "payment", id: "" }, { type: "payment" }])(
    "pedido %o → 400 e nada é reaberto",
    async (body) => {
      const response = await post(body)

      expect(response.status).toBe(400)
      expect(mocks.retry).not.toHaveBeenCalled()
    },
  )

  it.each([
    [{ type: "payment", id: "p1" }, { paymentId: "p1" }],
    [{ type: "plan_generation", id: "g1" }, { planGenerationId: "g1" }],
    [{ type: "notification", id: "n1" }, { notificationId: "n1" }],
  ])("%o chama o v0-tami-forms com %o e devolve reopened", async (body, target) => {
    mocks.retry.mockResolvedValue({ ok: true, reopened: 1 })

    const response = await post(body)

    expect(mocks.retry).toHaveBeenCalledWith(target)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true, reopened: 1 })
  })

  it("item que já não estava em falha → 200 com reopened 0", async () => {
    mocks.retry.mockResolvedValue({ ok: true, reopened: 0 })

    const response = await post({ type: "payment", id: "p1" })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true, reopened: 0 })
  })

  it("v0-tami-forms indisponível → 502", async () => {
    mocks.retry.mockResolvedValue({ ok: false })

    const response = await post({ type: "payment", id: "p1" })

    expect(response.status).toBe(502)
    expect(await response.json()).toEqual({ error: "Não foi possível reexecutar agora" })
  })

  it("registra tipo, reopened e admin, nunca o id do item", async () => {
    mocks.retry.mockResolvedValue({ ok: true, reopened: 1 })

    await post({ type: "notification", id: "id-secreto-123" })

    expect(mocks.log.info).toHaveBeenCalledWith("admin.failures.retry", {
      type: "notification",
      reopened: 1,
      adminId: "admin-1",
    })
    expect(JSON.stringify(mocks.log.info.mock.calls)).not.toContain("id-secreto-123")
  })
})
