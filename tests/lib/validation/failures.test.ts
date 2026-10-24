import { describe, expect, it } from "vitest"
import { parseAppLogsQuery, retryRequestSchema, toRetryTarget } from "@/lib/validation/failures"

const NOW = new Date("2026-10-24T15:00:00.000Z")
const q = (s: string) => parseAppLogsQuery(new URLSearchParams(s), NOW)

describe("retryRequestSchema e toRetryTarget", () => {
  it.each([
    ["payment", { paymentId: "x" }],
    ["plan_generation", { planGenerationId: "x" }],
    ["notification", { notificationId: "x" }],
  ] as const)("toRetryTarget(%s)", (type, target) => {
    expect(toRetryTarget({ type, id: "x" })).toEqual(target)
  })

  it("aceita os três tipos com id de 1 a 64 caracteres", () => {
    for (const type of ["payment", "plan_generation", "notification"]) {
      for (const id of ["a", "a".repeat(64)]) {
        expect(retryRequestSchema.safeParse({ type, id }).success).toBe(true)
      }
    }
  })

  it.each([
    { type: "allFailed", id: "x" },
    { type: "payment", id: "" },
    { type: "payment", id: "a".repeat(65) },
    { type: "payment", id: "x", extra: 1 },
    { type: "payment" },
    null,
  ])("recusa %o", (body) => {
    expect(retryRequestSchema.safeParse(body).success).toBe(false)
  })
})

describe("parseAppLogsQuery", () => {
  it("sem parâmetros: últimos 7 dias, warn e error, página 1, sem área", () => {
    expect(q("")).toEqual({
      ok: true,
      filter: { from: new Date("2026-10-17T15:00:00.000Z"), to: NOW, levels: ["warn", "error"], page: 1 },
    })
  })

  it("lê from, to, area, level e page", () => {
    expect(
      q("from=2026-10-01T03:00:00.000Z&to=2026-10-25T02:59:59.999Z&area=payment&level=error,info&page=3"),
    ).toEqual({
      ok: true,
      filter: {
        from: new Date("2026-10-01T03:00:00.000Z"),
        to: new Date("2026-10-25T02:59:59.999Z"),
        area: "payment",
        levels: ["error", "info"],
        page: 3,
      },
    })
  })

  it("aceita período de exatamente 90 dias", () => {
    const result = q("from=2026-07-26T15:00:00.000Z&to=2026-10-24T15:00:00.000Z")
    expect(result.ok).toBe(true)
  })

  it.each([
    "from=2026-10-24T00:00:00.000Z&to=2026-10-24T00:00:00.000Z", // from = to
    "from=2026-07-01T00:00:00.000Z&to=2026-10-24T00:00:00.000Z", // mais de 90 dias
    "from=2026-10-24", // só o dia, sem hora
    "from=24/10/2026",
    "to=ontem",
    "level=debug",
    "level=warn,warn",
    "level=",
    `area=${"a".repeat(41)}`,
    "area=",
    "page=0",
    "page=1.5",
    "page=10001",
    "page=abc",
  ])("recusa %s", (query) => {
    expect(q(query)).toEqual({ ok: false })
  })
})
