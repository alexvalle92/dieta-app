import { randomUUID } from "node:crypto"
import { and, desc, eq, like, or, type SQL } from "drizzle-orm"
import type { Db } from "@/lib/db/client"
import { recipes } from "@/lib/db/schema"
import { affectedRows, escapeLike } from "./mysql-errors"
import type { RecipeInput, RecipeRepo, RecipeRow } from "./types"

const columns = {
  id: recipes.id,
  title: recipes.title,
  description: recipes.description,
  ingredients: recipes.ingredients,
  preparation: recipes.preparation,
  tips: recipes.tips,
  prepTime: recipes.prepTime,
  servings: recipes.servings,
  calories: recipes.calories,
  category: recipes.category,
  imageUrl: recipes.imageUrl,
  portionQuantity: recipes.portionQuantity,
  proteins: recipes.proteins,
  lipids: recipes.lipids,
  carbohydrates: recipes.carbohydrates,
  fiber: recipes.fiber,
  activeCustomer: recipes.activeCustomer,
  createdAt: recipes.createdAt,
  updatedAt: recipes.updatedAt,
}

export function createRecipeRepo(db: Db): RecipeRepo {
  async function get(id: string): Promise<RecipeRow | null> {
    const [row] = await db.select(columns).from(recipes).where(eq(recipes.id, id)).limit(1)
    return row ?? null
  }

  return {
    get,

    async list({ onlyActive, search }) {
      const conditions: (SQL | undefined)[] = []
      if (onlyActive) conditions.push(eq(recipes.activeCustomer, true))
      const text = search.trim()
      if (text) {
        const pattern = `%${escapeLike(text)}%`
        conditions.push(or(like(recipes.title, pattern), like(recipes.category, pattern)))
      }
      return db
        .select(columns)
        .from(recipes)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(recipes.createdAt))
    },

    async create(d: RecipeInput, now) {
      const id = randomUUID()
      await db.insert(recipes).values({ id, ...d, createdAt: now, updatedAt: now })
      return (await get(id))!
    },

    async update(id, d, now) {
      await db
        .update(recipes)
        .set({ ...d, updatedAt: now })
        .where(eq(recipes.id, id))
      return get(id)
    },

    async delete(id) {
      const result = await db.delete(recipes).where(eq(recipes.id, id))
      return affectedRows(result) > 0
    },
  }
}
