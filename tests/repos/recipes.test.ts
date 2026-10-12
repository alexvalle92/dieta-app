import { randomUUID } from "node:crypto"
import type mysql from "mysql2/promise"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { createRecipeRepo } from "@/lib/repos/recipes"
import type { RecipeInput, RecipeRepo } from "@/lib/repos/types"
import { mysqlTestsEnabled, openTestDb, truncateAll } from "../helpers/test-db"

const T0 = new Date("2026-10-12T15:00:00.000Z")
const at = (seconds: number) => new Date(T0.getTime() + seconds * 1000)

describe.skipIf(!mysqlTestsEnabled)("RecipeRepo (MySQL)", () => {
  let pool: mysql.Pool
  let repo: RecipeRepo

  beforeAll(async () => {
    const opened = await openTestDb()
    pool = opened.pool
    repo = createRecipeRepo(opened.db)
  }, 60_000)

  beforeEach(async () => {
    await truncateAll(pool)
  })

  afterAll(async () => {
    await pool?.end()
  })

  const input = (over: Partial<RecipeInput> = {}): RecipeInput => ({
    title: "Frango grelhado",
    description: null,
    ingredients: ["Peito de frango", "Limão", "Sal"],
    preparation: "Grelhe por 10 minutos.",
    tips: null,
    prepTime: 20,
    servings: 2,
    calories: 320,
    category: "Almoço",
    imageUrl: null,
    portionQuantity: 150,
    proteins: 12.5,
    lipids: 4,
    carbohydrates: 0,
    fiber: null,
    activeCustomer: true,
    ...over,
  })

  it("create e get: ingredientes voltam como lista e os nutrientes como número", async () => {
    const created = await repo.create(input(), T0)

    const found = await repo.get(created.id)

    expect(found).toMatchObject({
      title: "Frango grelhado",
      ingredients: ["Peito de frango", "Limão", "Sal"],
      proteins: 12.5,
      lipids: 4,
      carbohydrates: 0,
      fiber: null,
      portionQuantity: 150,
      activeCustomer: true,
    })
    expect(typeof found!.proteins).toBe("number")
  })

  it("acentos, emoji e aspas sobrevivem ao ciclo de gravação", async () => {
    const created = await repo.create(input({ title: "Pão de queijo 🧀", ingredients: ['Polvilho "azedo"', "Açúcar"] }), T0)
    expect(await repo.get(created.id)).toMatchObject({
      title: "Pão de queijo 🧀",
      ingredients: ['Polvilho "azedo"', "Açúcar"],
    })
  })

  it("list({ onlyActive: true }) não traz receita com activeCustomer false", async () => {
    await repo.create(input({ title: "Ativa" }), at(1))
    await repo.create(input({ title: "Inativa", activeCustomer: false }), at(2))

    expect((await repo.list({ onlyActive: true, search: "" })).map((r) => r.title)).toEqual(["Ativa"])
    expect((await repo.list({ onlyActive: false, search: "" })).map((r) => r.title)).toEqual(["Inativa", "Ativa"])
  })

  it("list busca por título e categoria, ignorando maiúsculas, e trata % como texto", async () => {
    await repo.create(input({ title: "Frango grelhado", category: "Almoço" }), at(1))
    await repo.create(input({ title: "Mousse de maracujá", category: "Sobremesa" }), at(2))

    expect((await repo.list({ onlyActive: false, search: "FRANGO" })).map((r) => r.title)).toEqual(["Frango grelhado"])
    expect((await repo.list({ onlyActive: false, search: "sobremesa" })).map((r) => r.title)).toEqual([
      "Mousse de maracujá",
    ])
    expect(await repo.list({ onlyActive: false, search: "%" })).toEqual([])
  })

  it("update altera só os campos recebidos; null limpa; id inexistente → null", async () => {
    const created = await repo.create(input({ description: "Antiga", tips: "Dica" }), T0)

    const updated = await repo.update(created.id, { title: "Novo título", description: null, activeCustomer: false }, at(1))

    expect(updated).toMatchObject({
      title: "Novo título",
      description: null,
      tips: "Dica",
      activeCustomer: false,
      ingredients: ["Peito de frango", "Limão", "Sal"],
    })
    expect(await repo.update(randomUUID(), { title: "x" }, T0)).toBeNull()
  })

  it("delete devolve true e depois false", async () => {
    const created = await repo.create(input(), T0)
    expect(await repo.delete(created.id)).toBe(true)
    expect(await repo.delete(created.id)).toBe(false)
    expect(await repo.get(created.id)).toBeNull()
  })
})
