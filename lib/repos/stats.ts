import { and, count, eq, gte, lt } from "drizzle-orm"
import type { Db } from "@/lib/db/client"
import { mealPlans, patients, recipes } from "@/lib/db/schema"
import type { StatsRepo } from "./types"

export function createStatsRepo(db: Db): StatsRepo {
  const total = async (query: PromiseLike<{ n: number }[]>) => Number((await query)[0]?.n ?? 0)

  return {
    async admin({ monthStart, lastMonthStart }) {
      const [totalPatients, activePlans, totalRecipes, newThisMonth, newLastMonth] = await Promise.all([
        total(db.select({ n: count() }).from(patients)),
        total(db.select({ n: count() }).from(mealPlans).where(eq(mealPlans.status, "active"))),
        total(db.select({ n: count() }).from(recipes)),
        total(db.select({ n: count() }).from(patients).where(gte(patients.createdAt, monthStart))),
        total(
          db
            .select({ n: count() })
            .from(patients)
            .where(and(gte(patients.createdAt, lastMonthStart), lt(patients.createdAt, monthStart))),
        ),
      ])
      return { totalPatients, activePlans, totalRecipes, newThisMonth, newLastMonth }
    },

    async recipesCount() {
      return total(db.select({ n: count() }).from(recipes))
    },
  }
}
