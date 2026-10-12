import { randomUUID } from "node:crypto"
import { eq } from "drizzle-orm"
import type mysql from "mysql2/promise"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import type { Db } from "@/lib/db/client"
import { mealPlans, notifications, patients, payments, quizResponses } from "@/lib/db/schema"
import { createPatientRecordRepo } from "@/lib/repos/patient-record"
import type { PatientRecordRepo } from "@/lib/repos/types"
import { seedGeneratedPlan, seedQuizPatient } from "../helpers/seed"
import { mysqlTestsEnabled, openTestDb, truncateAll } from "../helpers/test-db"

const eqPatient = (id: string) => eq(patients.id, id)
const eqPayment = (id: string) => eq(payments.id, id)
const at = (day: number) => new Date(`2026-10-${String(day).padStart(2, "0")}T12:00:00.000Z`)

describe.skipIf(!mysqlTestsEnabled)("PatientRecordRepo (MySQL)", () => {
  let db: Db
  let pool: mysql.Pool
  let repo: PatientRecordRepo

  beforeAll(async () => {
    ;({ db, pool } = await openTestDb())
    repo = createPatientRecordRepo(db)
  }, 60_000)

  beforeEach(async () => {
    await truncateAll(pool)
  })

  afterAll(async () => {
    await pool?.end()
  })

  const addNotification = (patientId: string, over: Partial<typeof notifications.$inferInsert> = {}) =>
    db.insert(notifications).values({
      id: randomUUID(),
      patientId,
      channel: "email",
      kind: "password_reset",
      recipient: "x@example.com",
      status: "pending",
      nextAttemptAt: at(1),
      payload: { link: "https://plana.test/cliente/redefinir-senha/SEGREDO" },
      lastError: { step: "notify.email", message: "falha", attempt: 1, at: at(1).toISOString() },
      createdAt: at(10),
      updatedAt: at(10),
      ...over,
    })

  it("id inexistente → null", async () => {
    expect(await repo.get(randomUUID())).toBeNull()
  })

  it("paciente do quiz com plano gerado e um plano manual", async () => {
    const ids = await seedQuizPatient(db, { name: "Ana Souza", email: "ana@example.com" })
    await seedGeneratedPlan(db, ids)
    await db.insert(mealPlans).values({
      id: randomUUID(),
      patientId: ids.patientId,
      title: "Plano manual",
      startDate: "2026-10-01",
      status: "completed",
      planData: {},
      createdAt: at(1),
      updatedAt: at(1),
    })
    await db
      .update(payments)
      .set({ status: "RECEIVED", billingType: "PIX", dueDate: "2026-10-14", paidAt: at(12), paymentUrl: "https://asaas.test/i/1" })
      .where(eqPayment(ids.paymentId))

    const record = (await repo.get(ids.patientId))!

    expect(record.patient).toMatchObject({
      id: ids.patientId,
      name: "Ana Souza",
      email: "ana@example.com",
      hasPassword: false,
      mustChangePassword: false,
    })
    expect(record.quizResponses).toHaveLength(1)
    expect(record.quizResponses[0].answers).toEqual({ peso_kg: "70" })
    expect(record.payments).toHaveLength(1)
    expect(record.payments[0]).toMatchObject({
      amount: "39.90",
      status: "RECEIVED",
      billingType: "PIX",
      dueDate: "2026-10-14",
      paymentUrl: "https://asaas.test/i/1",
    })
    expect(record.payments[0].paidAt?.getTime()).toBe(at(12).getTime())
    expect(record.mealPlans.map((p) => [p.title, p.origin]).sort()).toEqual([
      ["Plano Alimentar 10/2026", "ai"],
      ["Plano manual", "admin"],
    ])
  })

  it("hasPassword e mustChangePassword refletem o cadastro", async () => {
    const { patientId } = await seedQuizPatient(db)
    await db
      .update(patients)
      .set({ passwordHash: "scrypt$x", mustChangePassword: true })
      .where(eqPatient(patientId))

    expect((await repo.get(patientId))!.patient).toMatchObject({ hasPassword: true, mustChangePassword: true })
  })

  it("as listas vêm do mais novo ao mais antigo", async () => {
    const { patientId, paymentId } = await seedQuizPatient(db)
    await db.insert(quizResponses).values({
      id: randomUUID(),
      submissionId: randomUUID(),
      patientId,
      answers: { peso_kg: "65" },
      firstQuiz: false,
      paymentId,
      createdAt: at(20),
      updatedAt: at(20),
    })
    await addNotification(patientId, { createdAt: at(11) })
    await addNotification(patientId, { createdAt: at(15) })

    const record = (await repo.get(patientId))!

    expect(record.quizResponses[0].answers).toEqual({ peso_kg: "65" })
    expect(record.notifications.map((n) => n.createdAt.getTime())).toEqual([at(15).getTime(), at(11).getTime()])
  })

  it("não mostra as mensagens de outro paciente", async () => {
    const a = await seedQuizPatient(db)
    const b = await seedQuizPatient(db)
    await addNotification(a.patientId)

    expect((await repo.get(a.patientId))!.notifications).toHaveLength(1)
    expect((await repo.get(b.patientId))!.notifications).toHaveLength(0)
  })

  it("o registro nunca expõe hash de senha, payload, last_error nem o cliente do Asaas", async () => {
    const { patientId, paymentId } = await seedQuizPatient(db)
    await db
      .update(patients)
      .set({ passwordHash: "scrypt$SEGREDO-HASH", asaasCustomerId: "cus_SEGREDO" })
      .where(eqPatient(patientId))
    await db
      .update(payments)
      .set({ asaasCustomerId: "cus_SEGREDO", lastError: { message: "SEGREDO-ERRO" } })
      .where(eqPayment(paymentId))
    await addNotification(patientId)

    const json = JSON.stringify(await repo.get(patientId))

    for (const forbidden of ["SEGREDO", "passwordHash", "password_hash", "payload", "lastError", "asaasCustomerId"]) {
      expect(json).not.toContain(forbidden)
    }
  })
})
