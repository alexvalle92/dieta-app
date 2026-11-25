// Substituições das refeições no editor do plano. A IA (`v0-tami-forms`) as cria e a nutricionista
// pode alterá-las, removê-las ou incluir novas no editor; o `PUT` sempre as devolve, senão salvar o
// plano as apagaria.

export type MealSubstitute = { foods: string; calories: string }

type EditorMeal = { name: string; time: string; calories: string; foods: string; substitutes: MealSubstitute[] }

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

/** Substitutas de uma refeição vinda do banco: só as que têm `foods` em texto não vazio. */
export function readSubstitutes(meal: unknown): MealSubstitute[] {
  if (!isObject(meal) || !Array.isArray(meal.substitutes)) return []
  return meal.substitutes.flatMap((sub): MealSubstitute[] => {
    if (!isObject(sub) || typeof sub.foods !== "string" || sub.foods.trim() === "") return []
    const calories =
      typeof sub.calories === "string"
        ? sub.calories
        : typeof sub.calories === "number" && Number.isFinite(sub.calories)
          ? String(sub.calories)
          : ""
    return [{ foods: sub.foods, calories }]
  })
}

/**
 * Refeição como vai no `plan_data`. Substitutas com `foods` vazio (deixadas em branco no editor)
 * são descartadas; sem nenhuma restante, a chave não é enviada.
 */
export function toMealPayload(meal: EditorMeal): Record<string, unknown> {
  const { name, time, calories, foods } = meal
  const substitutes = meal.substitutes.filter((sub) => sub.foods.trim() !== "")
  return substitutes.length > 0 ? { name, time, calories, foods, substitutes } : { name, time, calories, foods }
}
