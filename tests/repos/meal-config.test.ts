import type mysql from "mysql2/promise"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { createMealConfigRepo } from "@/lib/repos/meal-config"
import { createRecipeRepo } from "@/lib/repos/recipes"
import type { MealConfigRepo, RecipeRepo } from "@/lib/repos/types"
import { mysqlTestsEnabled, openTestDb, truncateAll } from "../helpers/test-db"

const T0 = new Date("2026-10-12T15:00:00.000Z")
const at = (seconds: number) => new Date(T0.getTime() + seconds * 1000)

describe.skipIf(!mysqlTestsEnabled)("MealConfigRepo (MySQL)", () => {
  let pool: mysql.Pool
  let repo: MealConfigRepo
  let recipes: RecipeRepo

  beforeAll(async () => {
    const opened = await openTestDb()
    pool = opened.pool
    repo = createMealConfigRepo(opened.db)
    recipes = createRecipeRepo(opened.db)
  }, 60_000)

  beforeEach(async () => {
    await truncateAll(pool)
  })

  afterAll(async () => {
    await pool?.end()
  })

  const newRecipe = (title: string) =>
    recipes.create(
      {
        title,
        description: null,
        ingredients: ["a"],
        preparation: "b",
        tips: null,
        prepTime: null,
        servings: null,
        calories: null,
        category: null,
        imageUrl: null,
        portionQuantity: null,
        proteins: null,
        lipids: null,
        carbohydrates: null,
        fiber: null,
        activeCustomer: true,
      },
      T0,
    )

  const category = async (name: string, seconds = 0) => {
    const created = await repo.createCategory(name, at(seconds))
    if (created === "name_taken") throw new Error("name_taken inesperado")
    return created
  }

  it("categorias: listadas por nome; nome repetido → name_taken", async () => {
    await category("Jantar")
    await category("Café da manhã")

    expect((await repo.listCategories()).map((c) => c.name)).toEqual(["Café da manhã", "Jantar"])
    expect(await repo.createCategory("Jantar", T0)).toBe("name_taken")
  })

  it("apagar a categoria apaga os itens permitidos dela, e só os dela", async () => {
    const lunch = await category("Almoço")
    const dinner = await category("Jantar", 1)
    await repo.createAllowedItem({ mealCategoryId: lunch.id, itemType: "food", foodName: "Arroz", recipeId: null }, T0)
    await repo.createAllowedItem({ mealCategoryId: dinner.id, itemType: "food", foodName: "Sopa", recipeId: null }, T0)

    await repo.deleteCategory(lunch.id)

    expect((await repo.listAllowedItems()).map((i) => i.foodName)).toEqual(["Sopa"])
  })

  it("apagar a receita apaga os itens permitidos ligados a ela", async () => {
    const lunch = await category("Almoço")
    const recipe = await newRecipe("Frango grelhado")
    await repo.createAllowedItem({ mealCategoryId: lunch.id, itemType: "recipe", foodName: null, recipeId: recipe.id }, T0)
    await repo.createAllowedItem({ mealCategoryId: lunch.id, itemType: "food", foodName: "Arroz", recipeId: null }, at(1))

    await recipes.delete(recipe.id)

    expect((await repo.listAllowedItems()).map((i) => i.foodName)).toEqual(["Arroz"])
  })

  it("listAllowedItems traz a categoria e, no item de receita, a receita", async () => {
    const lunch = await category("Almoço")
    const recipe = await newRecipe("Frango grelhado")
    await repo.createAllowedItem({ mealCategoryId: lunch.id, itemType: "food", foodName: "Arroz", recipeId: null }, at(1))
    await repo.createAllowedItem({ mealCategoryId: lunch.id, itemType: "recipe", foodName: null, recipeId: recipe.id }, at(2))

    const items = await repo.listAllowedItems()

    expect(items).toHaveLength(2)
    // O mais novo primeiro.
    expect(items[0]).toMatchObject({
      itemType: "recipe",
      foodName: null,
      category: { id: lunch.id, name: "Almoço" },
      recipe: { id: recipe.id, title: "Frango grelhado" },
    })
    expect(items[1]).toMatchObject({ itemType: "food", foodName: "Arroz", category: { name: "Almoço" }, recipe: null })
  })

  it("deleteAllowedItem remove só o item", async () => {
    const lunch = await category("Almoço")
    const a = await repo.createAllowedItem({ mealCategoryId: lunch.id, itemType: "food", foodName: "Arroz", recipeId: null }, T0)
    await repo.createAllowedItem({ mealCategoryId: lunch.id, itemType: "food", foodName: "Feijão", recipeId: null }, at(1))

    await repo.deleteAllowedItem(a.id)

    expect((await repo.listAllowedItems()).map((i) => i.foodName)).toEqual(["Feijão"])
  })

  it("definição técnica da dieta: vazia sem linha; o upsert mantém uma linha só e o último texto", async () => {
    expect(await repo.getDietDefinition()).toBe("")

    await repo.setDietDefinition("Primeira versão", T0)
    await repo.setDietDefinition("Segunda versão com acento: ção 💚", at(1))

    expect(await repo.getDietDefinition()).toBe("Segunda versão com acento: ção 💚")
    const [rows] = await pool.query<mysql.RowDataPacket[]>("SELECT COUNT(*) AS n FROM app_settings")
    expect(Number(rows[0].n)).toBe(1)
  })
})
