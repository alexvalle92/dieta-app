import { randomUUID } from "node:crypto"
import type mysql from "mysql2/promise"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import type { Db } from "@/lib/db/client"
import { mealPlans, patients, recipes } from "@/lib/db/schema"
import { createStatsRepo } from "@/lib/repos/stats"
import type { StatsRepo } from "@/lib/repos/types"
import { randomCpf } from "../helpers/seed"
import { mysqlTestsEnabled, openTestDb, truncateAll } from "../helpers/test-db"

const MONTH_START = new Date("2026-10-01T00:00:00.000Z")
const LAST_MONTH_START = new Date("2026-09-01T00:00:00.000Z")

describe.skipIf(!mysqlTestsEnabled)("StatsRepo (MySQL)", () => {
  let db: Db
  let pool: mysql.Pool
  let repo: StatsRepo

  beforeAll(async () => {
    ;({ db, pool } = await openTestDb())
    repo = createStatsRepo(db)
  }, 60_000)

  beforeEach(async () => {
    await truncateAll(pool)
  })

  afterAll(async () => {
    await pool?.end()
  })

  const addPatient = async (createdAt: Date) => {
    const id = randomUUID()
    await db.insert(patients).values({
      id,
      name: "Paciente",
      cpf: randomCpf(),
      email: `${id}@example.com`,
      phone: "11987654321",
      createdAt,
      updatedAt: createdAt,
    })
    return id
  }

  const addPlan = (patientId: string, status: string) =>
    db.insert(mealPlans).values({
      id: randomUUID(),
      patientId,
      title: "Plano",
      startDate: "2026-10-12",
      status,
      planData: {},
    })

  const addRecipe = () =>
    db.insert(recipes).values({ id: randomUUID(), title: "Receita", ingredients: ["a"], preparation: "b" })

  it("banco vazio → tudo zero", async () => {
    expect(await repo.admin({ monthStart: MONTH_START, lastMonthStart: LAST_MONTH_START })).toEqual({
      totalPatients: 0,
      activePlans: 0,
      totalRecipes: 0,
      newThisMonth: 0,
      newLastMonth: 0,
    })
    expect(await repo.recipesCount()).toBe(0)
  })

  it("conta pacientes, planos active, receitas e os novos de cada mês", async () => {
    const thisMonth = await addPatient(new Date("2026-10-05T12:00:00.000Z"))
    await addPatient(MONTH_START) // exatamente no início do mês: conta como deste mês
    await addPatient(new Date("2026-09-15T12:00:00.000Z"))
    await addPatient(new Date("2026-08-20T12:00:00.000Z"))
    await addPlan(thisMonth, "active")
    await addPlan(thisMonth, "active")
    await addPlan(thisMonth, "completed")
    await addRecipe()
    await addRecipe()

    expect(await repo.admin({ monthStart: MONTH_START, lastMonthStart: LAST_MONTH_START })).toEqual({
      totalPatients: 4,
      activePlans: 2,
      totalRecipes: 2,
      newThisMonth: 2,
      newLastMonth: 1,
    })
    expect(await repo.recipesCount()).toBe(2)
  })
})
