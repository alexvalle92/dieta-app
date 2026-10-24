import { randomUUID } from "node:crypto"
import type mysql from "mysql2/promise"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import type { Db } from "@/lib/db/client"
import { appLogs, notifications, patients, payments, planGenerations } from "@/lib/db/schema"
import { createFailuresRepo, toFailedLastError } from "@/lib/repos/failures"
import type { FailuresRepo } from "@/lib/repos/types"
import { randomCpf, seedQuizPatient } from "../helpers/seed"
import { mysqlTestsEnabled, openTestDb, truncateAll } from "../helpers/test-db"

const T1 = new Date("2026-10-24T10:00:00.000Z")
const T2 = new Date("2026-10-24T11:00:00.000Z")
const T3 = new Date("2026-10-24T12:00:00.000Z")

describe("toFailedLastError", () => {
  it("aproveita os campos válidos", () => {
    const raw = {
      step: "asaas.payment",
      message: "HTTP 400",
      attempt: 1,
      at: "2026-10-24T13:05:00.000Z",
      httpStatus: 400,
      responseBody: "{}",
    }
    expect(toFailedLastError(raw)).toEqual(raw)
  })

  it("descarta campos com tipo errado e mantém o resto", () => {
    expect(toFailedLastError({ step: "x", message: "m", httpStatus: "500", responseBody: 12, extra: true })).toEqual({
      step: "x",
      message: "m",
    })
  })

  it.each(["ontem", "", "24/13/2026", "2026-10-24T99:00:00.000Z"])(
    "descarta `at` que não é uma data válida (%j), para a tela não quebrar ao formatar",
    (at) => {
      expect(toFailedLastError({ step: "x", message: "m", attempt: 1, at })).toEqual({ step: "x", message: "m", attempt: 1 })
    },
  )

  it("sem step ou sem message em texto → null", () => {
    for (const raw of [null, "texto", [], { message: "m" }, { step: "x" }, { step: 1, message: "m" }]) {
      expect(toFailedLastError(raw)).toBeNull()
    }
  })
})

describe.skipIf(!mysqlTestsEnabled)("FailuresRepo (MySQL)", () => {
  let db: Db
  let pool: mysql.Pool
  let repo: FailuresRepo

  beforeAll(async () => {
    ;({ db, pool } = await openTestDb())
    repo = createFailuresRepo(db)
  }, 60_000)

  beforeEach(async () => {
    await truncateAll(pool)
  })

  afterAll(async () => {
    await pool?.end()
  })

  const lastError = (step: string) => ({ step, message: `erro em ${step}`, attempt: 2, at: "2026-10-24T09:00:00.000Z" })

  const addPatient = async (name = "Paciente Teste") => {
    const id = randomUUID()
    await db.insert(patients).values({
      id,
      name,
      cpf: randomCpf(),
      email: `${id}@example.com`,
      phone: "11987654321",
    })
    return id
  }

  const addPayment = async (patientId: string, over: { status: string; updatedAt?: Date; lastError?: unknown; syncAttempts?: number }) => {
    const id = randomUUID()
    await db.insert(payments).values({
      id,
      patientId,
      amount: "39.90",
      status: over.status,
      syncAttempts: over.syncAttempts ?? 0,
      lastError: over.lastError ?? null,
      updatedAt: over.updatedAt ?? T1,
    })
    return id
  }

  const addGeneration = async (status: "pending" | "done" | "failed", updatedAt: Date, error?: unknown) => {
    const ids = await seedQuizPatient(db)
    const id = randomUUID()
    await db.insert(planGenerations).values({
      id,
      paymentId: ids.paymentId,
      patientId: ids.patientId,
      quizResponseId: ids.quizResponseId,
      status,
      attempts: 5,
      lastError: error ?? null,
      updatedAt,
    })
    return { id, patientId: ids.patientId }
  }

  const addNotification = async (
    patientId: string,
    status: "pending" | "sent" | "failed",
    over: { channel?: "email" | "whatsapp"; kind?: string; updatedAt?: Date; lastError?: unknown } = {},
  ) => {
    const id = randomUUID()
    await db.insert(notifications).values({
      id,
      patientId,
      channel: over.channel ?? "email",
      kind: over.kind ?? "payment_link",
      recipient: "destino@example.com",
      status,
      attempts: 3,
      nextAttemptAt: T1,
      lastError: over.lastError ?? null,
      updatedAt: over.updatedAt ?? T1,
    })
    return id
  }

  const addLog = (over: { ts: Date; level?: string; area?: string; event?: string; fields?: Record<string, unknown> }) =>
    db.insert(appLogs).values({
      ts: over.ts,
      level: over.level ?? "error",
      event: over.event ?? `${over.area ?? "payment"}.falhou`,
      area: over.area ?? "payment",
      fields: over.fields ?? {},
    })

  describe("listFailed", () => {
    it("traz os três tipos em falha com o paciente, em updatedAt decrescente", async () => {
      const patientId = await addPatient("Maria Silva")
      const paymentId = await addPayment(patientId, { status: "ASAAS_FAILED", updatedAt: T1, lastError: lastError("asaas.payment"), syncAttempts: 8 })
      const notificationId = await addNotification(patientId, "failed", {
        channel: "whatsapp",
        kind: "payment_link",
        updatedAt: T2,
        lastError: lastError("whatsapp.send"),
      })
      const generation = await addGeneration("failed", T3, lastError("plan.validate"))

      const items = await repo.listFailed()

      expect(items.map((i) => i.type)).toEqual(["plan_generation", "notification", "payment"])
      const [gen, notif, pay] = items
      expect(gen).toMatchObject({ id: generation.id, attempts: 5, updatedAt: T3, lastError: { step: "plan.validate" } })
      expect(gen.patient.id).toBe(generation.patientId)
      expect(gen.channel).toBeUndefined()
      expect(notif).toMatchObject({
        id: notificationId,
        attempts: 3,
        channel: "whatsapp",
        kind: "payment_link",
        patient: { id: patientId, name: "Maria Silva", email: `${patientId}@example.com` },
      })
      expect(pay).toMatchObject({
        id: paymentId,
        attempts: 8,
        updatedAt: T1,
        patient: { id: patientId, name: "Maria Silva" },
        lastError: { step: "asaas.payment", message: "erro em asaas.payment", attempt: 2 },
      })
      expect(pay.channel).toBeUndefined()
    })

    it("ignora o que não está em falha", async () => {
      const patientId = await addPatient()
      for (const status of ["PENDING_ASAAS", "PENDING", "RECEIVED", "CONFIRMED"]) await addPayment(patientId, { status })
      await addGeneration("pending", T1)
      await addGeneration("done", T1)
      await addNotification(patientId, "pending")
      await addNotification(patientId, "sent")

      expect(await repo.listFailed()).toEqual([])
    })

    it("devolve lastError null quando o JSON é malformado", async () => {
      const patientId = await addPatient()
      await addPayment(patientId, { status: "ASAAS_FAILED", lastError: { message: "sem step" } })
      await addNotification(patientId, "failed")

      const items = await repo.listFailed()

      expect(items).toHaveLength(2)
      expect(items.every((i) => i.lastError === null)).toBe(true)
    })

    it("limita a 200 por tipo, os mais recentes", async () => {
      const patientId = await addPatient()
      const oldest = await addPayment(patientId, { status: "ASAAS_FAILED", updatedAt: new Date("2026-10-01T00:00:00.000Z") })
      for (let i = 0; i < 200; i++) {
        await addPayment(patientId, { status: "ASAAS_FAILED", updatedAt: new Date(T1.getTime() + i * 1000) })
      }

      const items = await repo.listFailed()

      expect(items).toHaveLength(200)
      expect(items.every((i) => i.type === "payment")).toBe(true)
      expect(items.some((i) => i.id === oldest)).toBe(false)
    })
  })

  describe("listAppLogs", () => {
    const FROM = new Date("2026-10-24T00:00:00.000Z")
    const TO = new Date("2026-10-25T00:00:00.000Z")
    const base = { from: FROM, to: TO, levels: ["warn", "error"] as ("info" | "warn" | "error")[], page: 1 }

    it("filtra por período (from incluído, to excluído), nível e área", async () => {
      await addLog({ ts: FROM, area: "payment", level: "error", event: "payment.no_inicio" })
      await addLog({ ts: new Date("2026-10-24T12:00:00.000Z"), area: "payment", level: "warn", event: "payment.meio" })
      await addLog({ ts: new Date("2026-10-24T12:00:00.000Z"), area: "payment", level: "info", event: "payment.info" })
      await addLog({ ts: new Date("2026-10-24T12:00:00.000Z"), area: "webhook", level: "error", event: "webhook.meio" })
      await addLog({ ts: TO, area: "payment", level: "error", event: "payment.no_fim" })
      await addLog({ ts: new Date("2026-10-23T23:59:59.999Z"), area: "payment", level: "error", event: "payment.antes" })

      const all = await repo.listAppLogs(base)
      expect(all.rows.map((r) => r.event).sort()).toEqual(["payment.meio", "payment.no_inicio", "webhook.meio"])
      expect(all.total).toBe(3)

      const onlyPayment = await repo.listAppLogs({ ...base, area: "payment" })
      expect(onlyPayment.rows.map((r) => r.event).sort()).toEqual(["payment.meio", "payment.no_inicio"])

      const withInfo = await repo.listAppLogs({ ...base, levels: ["info"] })
      expect(withInfo.rows.map((r) => r.event)).toEqual(["payment.info"])
    })

    it("devolve fields como objeto", async () => {
      await addLog({ ts: T1, fields: { status: 500, host: "api.asaas.com" } })
      const { rows } = await repo.listAppLogs(base)
      expect(rows[0]).toMatchObject({ level: "error", area: "payment", fields: { status: 500, host: "api.asaas.com" } })
      expect(typeof rows[0].id).toBe("number")
    })

    it("pagina de 50 em 50, do mais recente; total conta tudo", async () => {
      for (let i = 0; i < 51; i++) await addLog({ ts: new Date(FROM.getTime() + i * 1000), event: `payment.n${i}` })

      const first = await repo.listAppLogs({ ...base, page: 1 })
      const second = await repo.listAppLogs({ ...base, page: 2 })

      expect(first.rows).toHaveLength(50)
      expect(first.rows[0].event).toBe("payment.n50")
      expect(second.rows.map((r) => r.event)).toEqual(["payment.n0"])
      expect(first.total).toBe(51)
      expect(second.total).toBe(51)
    })

    it("além da última página → rows [] e total certo", async () => {
      for (let i = 0; i < 3; i++) await addLog({ ts: new Date(FROM.getTime() + i * 1000) })

      const page = await repo.listAppLogs({ ...base, page: 10 })

      expect(page.rows).toEqual([])
      expect(page.total).toBe(3)
    })

    it("areas é a lista distinta e ordenada do período e nível, ignorando o filtro de área", async () => {
      await addLog({ ts: T1, area: "webhook", level: "error" })
      await addLog({ ts: T1, area: "payment", level: "warn" })
      await addLog({ ts: T1, area: "payment", level: "error" })
      await addLog({ ts: T1, area: "plan", level: "info" })
      await addLog({ ts: new Date("2026-10-20T00:00:00.000Z"), area: "antiga", level: "error" })

      const page = await repo.listAppLogs({ ...base, area: "payment" })

      expect(page.rows.every((r) => r.area === "payment")).toBe(true)
      expect(page.areas).toEqual(["payment", "webhook"])
    })
  })
})
