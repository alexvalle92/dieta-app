import { randomUUID } from "node:crypto"
import type mysql from "mysql2/promise"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import type { Db } from "@/lib/db/client"
import { payments, quizResponses } from "@/lib/db/schema"
import { createRenewalRepo } from "@/lib/repos/renewals"
import type { RenewalRepo } from "@/lib/repos/types"
import { seedQuizPatient } from "../helpers/seed"
import { mysqlTestsEnabled, openTestDb, truncateAll } from "../helpers/test-db"

// Os instantes ficam no futuro, depois das linhas do seed (criadas com o relógio do banco).
const T0 = new Date("2999-01-01T00:00:00.000Z")
const at = (seconds: number) => new Date(T0.getTime() + seconds * 1000)

describe.skipIf(!mysqlTestsEnabled)("RenewalRepo (MySQL)", () => {
  let db: Db
  let pool: mysql.Pool
  let repo: RenewalRepo
  let patientId: string

  beforeAll(async () => {
    ;({ db, pool } = await openTestDb())
    repo = createRenewalRepo(db)
  }, 60_000)

  beforeEach(async () => {
    await truncateAll(pool)
    ;({ patientId } = await seedQuizPatient(db))
  })

  afterAll(async () => {
    await pool?.end()
  })

  const insertCharge = async (over: Partial<typeof payments.$inferInsert> & { createdAt: Date }, owner = patientId) => {
    const id = randomUUID()
    await db.insert(payments).values({ id, patientId: owner, amount: "39.90", status: "PENDING", ...over })
    return id
  }

  describe("latestChargeAfter", () => {
    it("ignora a cobrança criada antes de `after`", async () => {
      await insertCharge({ createdAt: at(-10) })
      expect(await repo.latestChargeAfter(patientId, at(0))).toBeNull()
    })

    it("`after` é exclusivo: cobrança criada no mesmo instante não conta", async () => {
      await insertCharge({ createdAt: at(0) })
      expect(await repo.latestChargeAfter(patientId, at(0))).toBeNull()
    })

    it("entre duas posteriores, devolve a de createdAt maior, com os campos da regra", async () => {
      await insertCharge({ createdAt: at(10), status: "OVERDUE" })
      const newest = await insertCharge({
        createdAt: at(20),
        status: "PENDING",
        dueDate: "2026-10-20",
        paymentUrl: "https://pay.example/abc",
        paidAt: at(30),
      })

      expect(await repo.latestChargeAfter(patientId, at(0))).toEqual({
        id: newest,
        status: "PENDING",
        dueDate: "2026-10-20",
        paymentUrl: "https://pay.example/abc",
        paidAt: at(30),
      })
    })

    it("sem cobrança posterior → null", async () => {
      // Só a cobrança do seed existe, criada antes de `after`.
      expect(await repo.latestChargeAfter(patientId, at(0))).toBeNull()
    })

    it("não devolve cobrança de outro paciente", async () => {
      const other = await seedQuizPatient(db)
      await insertCharge({ createdAt: at(10) }, other.patientId)
      expect(await repo.latestChargeAfter(patientId, at(0))).toBeNull()
    })
  })

  describe("latestAnswers", () => {
    it("devolve as respostas do envio mais recente", async () => {
      await db.insert(quizResponses).values({
        id: randomUUID(),
        submissionId: randomUUID(),
        patientId,
        answers: { peso_kg: "72" },
        firstQuiz: false,
        createdAt: at(10),
      })
      await db.insert(quizResponses).values({
        id: randomUUID(),
        submissionId: randomUUID(),
        patientId,
        answers: { peso_kg: "71" },
        firstQuiz: false,
        createdAt: at(5),
      })
      expect(await repo.latestAnswers(patientId)).toEqual({ peso_kg: "72" })
    })

    it("paciente sem envio → null", async () => {
      expect(await repo.latestAnswers(randomUUID())).toBeNull()
    })
  })
})
