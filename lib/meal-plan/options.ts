// Opções de uma refeição do `plan_data`: a principal (`foods`/`calories`) e as substitutas
// (`substitutes`). O `plan_data` é gravado pelo `v0-tami-forms` e editado no admin, então tudo é
// lido como `unknown`: o que não tem o formato esperado é ignorado, nunca derruba a tela.

export type MealOption = { foods: string[]; calories: string | null }

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

function foodLines(foods: unknown): string[] {
  if (typeof foods !== "string") return []
  return foods
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "")
}

function caloriesText(calories: unknown): string | null {
  if (typeof calories === "string") return calories.trim() === "" ? null : calories.trim()
  if (typeof calories === "number" && Number.isFinite(calories)) return String(calories)
  return null
}

/** `[principal, ...substitutas]`; `[]` se a refeição não é um objeto. */
export function mealOptions(meal: unknown): MealOption[] {
  if (!isObject(meal)) return []

  const primary: MealOption = { foods: foodLines(meal.foods), calories: caloriesText(meal.calories) }
  const substitutes = Array.isArray(meal.substitutes) ? meal.substitutes : []

  const alternatives = substitutes.flatMap((sub): MealOption[] => {
    if (!isObject(sub)) return []
    const foods = foodLines(sub.foods)
    return foods.length > 0 ? [{ foods, calories: caloriesText(sub.calories) }] : []
  })

  return [primary, ...alternatives]
}
