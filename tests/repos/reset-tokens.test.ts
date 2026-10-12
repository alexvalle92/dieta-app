import { eq } from "drizzle-orm"
import type mysql from "mysql2/promise"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import type { Db } from "@/lib/db/client"
import { notifications, passwordResetTokens, patients } from "@/lib/db/schema"
import { createPatientRepo } from "@/lib/repos/patients"
import { createResetTokenRepo } from "@/lib/repos/reset-tokens"
import type { ResetTokenRepo } from "@/lib/repos/types"
import { randomCpf } from "../helpers/seed"
import { mysqlTestsEnabled, openTestDb, truncateAll } from "../helpers/test-db"

const NOW = new Date("2026-10-12T15:00:00.000Z")
const HOUR = 3_600_000
const inMs = (ms: number) => new Date(NOW.getTime() + ms)

describe.skipIf(!mysqlTestsEnabled)("ResetTokenRepo (MySQL)", () => {
  let db: Db
  let pool: mysql.Pool
  let repo: ResetTokenRepo
  let patientId: string

  beforeAll(async () => {
    ;({ db, pool } = await openTestDb())
    repo = createResetTokenRepo(db)
  }, 60_000)

  beforeEach(async () => {
    await truncateAll(pool)
    const created = await createPatientRepo(db).create({
      name: "Ana Souza",
      cpf: randomCpf(),
      email: "ana@example.com",
      phone: "11987654321",
      passwordHash: "hash-antigo",
    })
    if (created === "cpf_taken") throw new Error("cpf_taken inesperado")
    patientId = created.id
  })

  afterAll(async () => {
    await pool?.end()
  })

  const request = (over: Partial<Parameters<ResetTokenRepo["createRequest"]>[0]> = {}) =>
    repo.createRequest({
      patientId,
      tokenHash: "a".repeat(64),
      expiresAt: inMs(HOUR),
      link: "https://plana.test/cliente/redefinir-senha/tok",
      recipients: [
        { channel: "email", recipient: "ana@example.com" },
        { channel: "whatsapp", recipient: "5511987654321" },
      ],
      now: NOW,
      ...over,
    })

  it("createRequest grava o token e uma mensagem password_reset por destinatário", async () => {
    const { notificationIds } = await request()
    expect(notificationIds).toHaveLength(2)

    const [token] = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.patientId, patientId))
    expect(token).toMatchObject({ tokenHash: "a".repeat(64), used: false })
    expect(token.expiresAt.getTime()).toBe(inMs(HOUR).getTime())

    const rows = await db.select().from(notifications).where(eq(notifications.patientId, patientId))
    expect(rows).toHaveLength(2)
    for (const row of rows) {
      expect(row).toMatchObject({
        kind: "password_reset",
        status: "pending",
        quizResponseId: null,
        paymentId: null,
        partsSent: 0,
        attempts: 0,
        payload: { link: "https://plana.test/cliente/redefinir-senha/tok" },
      })
      expect(row.nextAttemptAt.getTime()).toBe(NOW.getTime())
    }
    expect(rows.map((r) => r.recipient).sort()).toEqual(["5511987654321", "ana@example.com"])
    expect(rows.map((r) => r.id).sort()).toEqual([...notificationIds].sort())
  })

  it("createRequest sem destinatários grava só o token", async () => {
    const { notificationIds } = await request({ recipients: [] })

    expect(notificationIds).toEqual([])
    expect(await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.patientId, patientId))).toHaveLength(1)
    expect(await db.select().from(notifications).where(eq(notifications.patientId, patientId))).toEqual([])
  })

  it("redeem com hash desconhecido → invalid", async () => {
    expect(await repo.redeem({ tokenHash: "f".repeat(64), passwordHash: "novo", now: NOW })).toBe("invalid")
  })

  it("redeem de token vencido (expires_at = now) → expired, e a senha não muda", async () => {
    await request({ expiresAt: NOW })

    expect(await repo.redeem({ tokenHash: "a".repeat(64), passwordHash: "novo", now: NOW })).toBe("expired")
    expect((await createPatientRepo(db).getById(patientId))?.passwordHash).toBe("hash-antigo")
  })

  it("redeem válido troca a senha, zera a troca obrigatória, invalida todos os tokens e não repete", async () => {
    await request()
    await request({ tokenHash: "b".repeat(64), recipients: [] })

    expect(await repo.redeem({ tokenHash: "a".repeat(64), passwordHash: "novo-hash", now: NOW })).toBe("ok")

    const [patient] = await db.select().from(patients).where(eq(patients.id, patientId))
    expect(patient).toMatchObject({ passwordHash: "novo-hash", mustChangePassword: false })
    expect(patient.passwordSetAt?.getTime()).toBe(NOW.getTime())

    const tokens = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.patientId, patientId))
    expect(tokens).toHaveLength(2)
    expect(tokens.every((t) => t.used)).toBe(true)

    expect(await repo.redeem({ tokenHash: "a".repeat(64), passwordHash: "outro", now: NOW })).toBe("invalid")
    expect(await repo.redeem({ tokenHash: "b".repeat(64), passwordHash: "outro", now: NOW })).toBe("invalid")
  })
})
