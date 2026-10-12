import { describe, expect, it, vi } from "vitest"
import { createFormsClient } from "@/lib/forms-client"
import type { Logger } from "@/lib/log"

const TOKEN = "t".repeat(40)

function fakeLog() {
  const log: Logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
  return log
}

describe("formsClient.dispatchNotifications", () => {
  it("faz POST em /api/notifications/dispatch com o Bearer e o corpo certos", async () => {
    const fetchImpl = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => new Response("{}", { status: 202 }))
    const client = createFormsClient({ baseUrl: "http://forms:5000", token: TOKEN, fetchImpl, log: fakeLog() })

    expect(await client.dispatchNotifications(["a", "b"])).toBe(true)

    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe("http://forms:5000/api/notifications/dispatch")
    expect(init?.method).toBe("POST")
    const headers = new Headers(init?.headers)
    expect(headers.get("authorization")).toBe(`Bearer ${TOKEN}`)
    expect(headers.get("content-type")).toBe("application/json")
    expect(JSON.parse(String(init?.body))).toEqual({ notificationIds: ["a", "b"] })
  })

  it("baseUrl terminada em / não duplica a barra", async () => {
    const fetchImpl = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => new Response("{}", { status: 202 }))
    const client = createFormsClient({ baseUrl: "http://forms:5000/", token: TOKEN, fetchImpl, log: fakeLog() })

    await client.dispatchNotifications(["a"])

    expect(fetchImpl.mock.calls[0][0]).toBe("http://forms:5000/api/notifications/dispatch")
  })

  it("lista vazia → true sem chamar fetch", async () => {
    const fetchImpl = vi.fn()
    const client = createFormsClient({ baseUrl: "http://forms:5000", token: TOKEN, fetchImpl, log: fakeLog() })

    expect(await client.dispatchNotifications([])).toBe(true)
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it("401 → false com aviso no log, sem lançar", async () => {
    const log = fakeLog()
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 401 }))
    const client = createFormsClient({ baseUrl: "http://forms:5000", token: TOKEN, fetchImpl, log })

    expect(await client.dispatchNotifications(["a"])).toBe(false)
    expect(log.warn).toHaveBeenCalledWith("forms.dispatch.failed", expect.objectContaining({ status: 401 }))
  })

  it("erro de rede → false com aviso no log, sem o token", async () => {
    const log = fakeLog()
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("fetch failed")
    })
    const client = createFormsClient({ baseUrl: "http://forms:5000", token: TOKEN, fetchImpl, log })

    expect(await client.dispatchNotifications(["a"])).toBe(false)
    expect(log.warn).toHaveBeenCalledWith("forms.dispatch.failed", expect.anything())
    expect(JSON.stringify((log.warn as ReturnType<typeof vi.fn>).mock.calls)).not.toContain(TOKEN)
  })

  it("tempo esgotado → false", async () => {
    const log = fakeLog()
    const fetchImpl = vi.fn(
      (_url: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")))
        }),
    )
    const client = createFormsClient({ baseUrl: "http://forms:5000", token: TOKEN, fetchImpl, timeoutMs: 20, log })

    expect(await client.dispatchNotifications(["a"])).toBe(false)
    expect(log.warn).toHaveBeenCalledWith("forms.dispatch.failed", expect.anything())
  })
})

describe("formsClient.submitRenewal", () => {
  const body = { submissionId: "0b5f3a9e-8f5e-4d0c-9c0e-3b3f0f6a1c11", answers: { cpf: "52998224725", sono: "7–8 horas" } }
  const json = (payload: unknown, status = 200) =>
    new Response(JSON.stringify(payload), { status, headers: { "content-type": "application/json" } })

  it("faz POST em /api/renewals com o Bearer e o corpo, e devolve o link", async () => {
    const fetchImpl = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) =>
      json({ ok: true, paymentUrl: "https://a/i/1" }),
    )
    const client = createFormsClient({ baseUrl: "http://forms:5000/", token: TOKEN, fetchImpl, log: fakeLog() })

    expect(await client.submitRenewal(body)).toEqual({ ok: true, paymentUrl: "https://a/i/1" })

    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe("http://forms:5000/api/renewals")
    expect(init?.method).toBe("POST")
    const headers = new Headers(init?.headers)
    expect(headers.get("authorization")).toBe(`Bearer ${TOKEN}`)
    expect(headers.get("content-type")).toBe("application/json")
    expect(JSON.parse(String(init?.body))).toEqual(body)
  })

  it("paymentUrl nulo (link ainda sendo criado) → ok com paymentUrl null", async () => {
    const fetchImpl = vi.fn(async () => json({ ok: true, paymentUrl: null }))
    const client = createFormsClient({ baseUrl: "http://forms:5000", token: TOKEN, fetchImpl, log: fakeLog() })

    expect(await client.submitRenewal(body)).toEqual({ ok: true, paymentUrl: null })
  })

  it("200 sem ok: true → ok false", async () => {
    const fetchImpl = vi.fn(async () => json({ ok: false }))
    const client = createFormsClient({ baseUrl: "http://forms:5000", token: TOKEN, fetchImpl, log: fakeLog() })

    expect(await client.submitRenewal(body)).toEqual({ ok: false })
  })

  it.each([400, 401, 413, 500])("status %i → ok false, sem lançar", async (status) => {
    const log = fakeLog()
    const fetchImpl = vi.fn(async () => json({ ok: false }, status))
    const client = createFormsClient({ baseUrl: "http://forms:5000", token: TOKEN, fetchImpl, log })

    expect(await client.submitRenewal(body)).toEqual({ ok: false })
    expect(log.warn).toHaveBeenCalledWith("forms.renewal.failed", expect.objectContaining({ status }))
  })

  it("corpo que não é JSON → ok false", async () => {
    const fetchImpl = vi.fn(async () => new Response("<html>bad gateway</html>", { status: 200 }))
    const client = createFormsClient({ baseUrl: "http://forms:5000", token: TOKEN, fetchImpl, log: fakeLog() })

    expect(await client.submitRenewal(body)).toEqual({ ok: false })
  })

  it("erro de rede → ok false, e o log não leva o token nem os dados do paciente", async () => {
    const log = fakeLog()
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("fetch failed")
    })
    const client = createFormsClient({ baseUrl: "http://forms:5000", token: TOKEN, fetchImpl, log })

    expect(await client.submitRenewal(body)).toEqual({ ok: false })
    const logged = JSON.stringify((log.warn as ReturnType<typeof vi.fn>).mock.calls)
    expect(logged).toContain("forms.renewal.failed")
    expect(logged).not.toContain(TOKEN)
    expect(logged).not.toContain("52998224725")
  })

  it("tempo esgotado → ok false", async () => {
    const fetchImpl = vi.fn(
      (_url: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")))
        }),
    )
    const client = createFormsClient({
      baseUrl: "http://forms:5000",
      token: TOKEN,
      fetchImpl,
      renewalTimeoutMs: 20,
      log: fakeLog(),
    })

    expect(await client.submitRenewal(body)).toEqual({ ok: false })
  })
})
