import { randomUUID } from "node:crypto"
import { asc, desc, eq } from "drizzle-orm"
import type { Db } from "@/lib/db/client"
import { allowedMealItems, appSettings, mealCategories, recipes } from "@/lib/db/schema"
import { isDuplicateEntry } from "./mysql-errors"
import type { MealCategoryRow, MealConfigRepo } from "./types"

/** Única linha de `app_settings`. */
const SETTINGS_ID = "global"

export function createMealConfigRepo(db: Db): MealConfigRepo {
  return {
    async listCategories() {
      return db
        .select({ id: mealCategories.id, name: mealCategories.name, createdAt: mealCategories.createdAt })
        .from(mealCategories)
        .orderBy(asc(mealCategories.name))
    },

    async createCategory(name, now): Promise<MealCategoryRow | "name_taken"> {
      const id = randomUUID()
      try {
        await db.insert(mealCategories).values({ id, name, createdAt: now, updatedAt: now })
      } catch (error) {
        if (isDuplicateEntry(error)) return "name_taken"
        throw error
      }
      return { id, name, createdAt: now }
    },

    async deleteCategory(id) {
      // A cascata do banco apaga os itens permitidos da categoria.
      await db.delete(mealCategories).where(eq(mealCategories.id, id))
    },

    async listAllowedItems() {
      return db
        .select({
          id: allowedMealItems.id,
          itemType: allowedMealItems.itemType,
          foodName: allowedMealItems.foodName,
          createdAt: allowedMealItems.createdAt,
          category: { id: mealCategories.id, name: mealCategories.name },
          recipe: { id: recipes.id, title: recipes.title },
        })
        .from(allowedMealItems)
        .innerJoin(mealCategories, eq(allowedMealItems.mealCategoryId, mealCategories.id))
        .leftJoin(recipes, eq(allowedMealItems.recipeId, recipes.id))
        .orderBy(desc(allowedMealItems.createdAt))
    },

    async createAllowedItem(d, now) {
      const id = randomUUID()
      await db.insert(allowedMealItems).values({
        id,
        mealCategoryId: d.mealCategoryId,
        itemType: d.itemType,
        foodName: d.foodName,
        recipeId: d.recipeId,
        createdAt: now,
        updatedAt: now,
      })
      return { id }
    },

    async deleteAllowedItem(id) {
      await db.delete(allowedMealItems).where(eq(allowedMealItems.id, id))
    },

    async getDietDefinition() {
      const [row] = await db
        .select({ text: appSettings.dietTechnicalDefinition })
        .from(appSettings)
        .where(eq(appSettings.id, SETTINGS_ID))
        .limit(1)
      return row?.text ?? ""
    },

    async setDietDefinition(text, now) {
      await db
        .insert(appSettings)
        .values({ id: SETTINGS_ID, dietTechnicalDefinition: text, createdAt: now, updatedAt: now })
        .onDuplicateKeyUpdate({ set: { dietTechnicalDefinition: text, updatedAt: now } })
    },
  }
}
