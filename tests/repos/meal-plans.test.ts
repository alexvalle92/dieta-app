import { randomUUID } from "node:crypto"
import type mysql from "mysql2/promise"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { eq } from "drizzle-orm"
import type { Db } from "@/lib/db/client"
import { notifications } from "@/lib/db/schema"
import { createMealPlanRepo } from "@/lib/repos/meal-plans"
import type { MealPlanInput, MealPlanRepo } from "@/lib/repos/types"
import { seedGeneratedPlan, seedQuizPatient } from "../helpers/seed"
import { mysqlTestsEnabled, openTestDb, truncateAll } from "../helpers/test-db"

const T0 = new Date("2026-10-12T15:00:00.000Z")
const at = (seconds: number) => new Date(T0.getTime() + seconds * 1000)

describe.skipIf(!mysqlTestsEnabled)("MealPlanRepo (MySQL)", () => {
  let db: Db
  let pool: mysql.Pool
  let repo: MealPlanRepo
  let patientId: string

  beforeAll(async () => {
    ;({ db, pool } = await openTestDb())
    repo = createMealPlanRepo(db)
  }, 60_000)

  beforeEach(async () => {
    await truncateAll(pool)
    ;({ patientId } = await seedQuizPatient(db, { name: "Ana Souza" }))
  })

  afterAll(async () => {
    await pool?.end()
  })

  const input = (over: Partial<MealPlanInput> = {}): MealPlanInput => ({
    patientId,
    title: "Plano",
    description: null,
    startDate: "2026-10-12",
    endDate: null,
    status: "active",
    planData: { meals: [{ name: "Café", time: "07:00", foods: "Pão — 50 g", calories: "150" }], calories: 1800, observations: "ok" },
    ...over,
  })

  const create = async (over: Partial<MealPlanInput> = {}, seconds = 0) => {
    const result = await repo.create(input(over), at(seconds))
    if (result === "patient_not_found") throw new Error("patient_not_found inesperado")
    return result
  }

  const statusOf = async (id: string) => (await repo.get(id))?.status

  it("create com paciente inexistente → patient_not_found", async () => {
    expect(await repo.create(input({ patientId: randomUUID() }), T0)).toBe("patient_not_found")
  })

  it("create devolve o plano com o paciente e o planData como objeto", async () => {
    const plan = await create({ title: "Plano de Outubro", description: "Obs" })

    expect(plan).toMatchObject({
      title: "Plano de Outubro",
      description: "Obs",
      status: "active",
      startDate: "2026-10-12",
      endDate: null,
      patient: { id: patientId, name: "Ana Souza" },
    })
    expect(plan.planData).toEqual(input().planData)
    expect(plan.createdAt.getTime()).toBe(T0.getTime())
  })

  it("um segundo plano active conclui o anterior; o plano active de outro paciente não muda", async () => {
    const other = await seedQuizPatient(db)
    const otherPlan = await create({ patientId: other.patientId })
    const a = await create({}, 1)
    const b = await create({}, 2)

    expect(await statusOf(a.id)).toBe("completed")
    expect(await statusOf(b.id)).toBe("active")
    expect(await statusOf(otherPlan.id)).toBe("active")
  })

  it("um plano completed novo não altera o plano active", async () => {
    const b = await create({}, 1)
    await create({ status: "completed" }, 2)
    expect(await statusOf(b.id)).toBe("active")
  })

  it("update para active conclui o outro plano active do paciente", async () => {
    const b = await create({}, 1)
    const c = await create({ status: "completed" }, 2)

    const updated = await repo.update(c.id, { status: "active" }, at(3))

    expect(updated).not.toBe("not_found")
    expect(await statusOf(c.id)).toBe("active")
    expect(await statusOf(b.id)).toBe("completed")
  })

  it("update só do título não mexe no status dos outros planos", async () => {
    const b = await create({}, 1)
    const c = await create({ status: "completed" }, 2)

    await repo.update(c.id, { title: "Novo título" }, at(3))

    expect(await statusOf(b.id)).toBe("active")
    expect(await statusOf(c.id)).toBe("completed")
    expect((await repo.get(c.id))?.title).toBe("Novo título")
  })

  it("update passa description e endDate para nulo quando recebem null", async () => {
    const plan = await create({ description: "Obs", endDate: "2026-11-11" })

    const updated = await repo.update(plan.id, { description: null, endDate: null }, at(1))

    expect(updated).toMatchObject({ description: null, endDate: null })
  })

  it("update de id ou de paciente inexistente", async () => {
    const plan = await create()
    expect(await repo.update(randomUUID(), { title: "x" }, T0)).toBe("not_found")
    expect(await repo.update(plan.id, { patientId: randomUUID() }, T0)).toBe("patient_not_found")
  })

  it("getForPatient exige que o plano seja do paciente", async () => {
    const plan = await create()
    const other = await seedQuizPatient(db)

    expect((await repo.getForPatient(plan.id, patientId))?.id).toBe(plan.id)
    expect(await repo.getForPatient(plan.id, other.patientId)).toBeNull()
  })

  it("listByPatient e listAll vêm do mais novo ao mais antigo", async () => {
    const first = await create({ title: "Primeiro", status: "completed" }, 1)
    const second = await create({ title: "Segundo", status: "completed" }, 2)

    expect((await repo.listByPatient(patientId)).map((p) => p.id)).toEqual([second.id, first.id])
    const all = await repo.listAll()
    expect(all.map((p) => p.id)).toEqual([second.id, first.id])
    expect(all[0].patient).toMatchObject({ id: patientId, name: "Ana Souza" })
  })

  describe("delete", () => {
    it("plano criado à mão → deleted", async () => {
      const plan = await create()
      expect(await repo.delete(plan.id)).toBe("deleted")
      expect(await repo.get(plan.id)).toBeNull()
    })

    it("plano gerado por pagamento (tem plan_generations) → in_use, e o plano continua", async () => {
      const ids = await seedQuizPatient(db)
      const { mealPlanId } = await seedGeneratedPlan(db, ids)

      expect(await repo.delete(mealPlanId)).toBe("in_use")
      expect(await repo.get(mealPlanId)).not.toBeNull()
    })

    it("id inexistente → not_found", async () => {
      expect(await repo.delete(randomUUID())).toBe("not_found")
    })

    it("plano com aviso de vencimento ligado → deleted, e a notificação some", async () => {
      const plan = await create()
      await db.insert(notifications).values({
        id: randomUUID(),
        patientId,
        mealPlanId: plan.id,
        channel: "email",
        kind: "plan_expiring_d5",
        recipient: "ana@example.com",
        status: "pending",
        nextAttemptAt: T0,
      })

      expect(await repo.delete(plan.id)).toBe("deleted")
      expect(await repo.get(plan.id)).toBeNull()
      expect(await db.select({ id: notifications.id }).from(notifications).where(eq(notifications.mealPlanId, plan.id))).toEqual([])
    })

    it("plano em uso com aviso de vencimento → in_use, e a notificação continua", async () => {
      const ids = await seedQuizPatient(db)
      const { mealPlanId } = await seedGeneratedPlan(db, ids)
      await db.insert(notifications).values({
        id: randomUUID(),
        patientId: ids.patientId,
        mealPlanId,
        channel: "email",
        kind: "plan_expiring_d5",
        recipient: "ana@example.com",
        status: "pending",
        nextAttemptAt: T0,
      })

      expect(await repo.delete(mealPlanId)).toBe("in_use")
      expect(await db.select({ id: notifications.id }).from(notifications).where(eq(notifications.mealPlanId, mealPlanId))).toHaveLength(1)
    })
  })
})
