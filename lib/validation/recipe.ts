import type { RecipeInput } from "@/lib/repos/types"

export type RecipeBodyResult = { ok: true; value: RecipeInput } | { ok: false; error: string }

const MISSING_ERROR = "Campos obrigatórios: title, ingredients, preparation"
const INGREDIENTS_ERROR = "Ingredientes deve ser um array não vazio"
const MAX_TITLE_LENGTH = 200
const MAX_CATEGORY_LENGTH = 100
/** DECIMAL(10,2): até 99.999.999,99. */
const MAX_DECIMAL = 99_999_999.99
const MAX_INT = 2_147_483_647

const isEmpty = (value: unknown) => value === undefined || value === null || value === ""

/** "3,5" e 3.5 viram 3.5; vazio vira null; o que não é número (ou é negativo, ou grande demais) é erro. */
function parseNumber(value: unknown, opts: { integer: boolean; max: number }): number | null | "invalid" {
  if (isEmpty(value)) return null
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value.trim().replace(",", ".")) : NaN
  if (!Number.isFinite(n) || n < 0 || n > opts.max) return "invalid"
  if (opts.integer && !Number.isInteger(n)) return "invalid"
  return n
}

function parseOptionalText(value: unknown, maxLength: number): string | null | "invalid" {
  if (isEmpty(value)) return null
  if (typeof value !== "string" || value.length > maxLength) return "invalid"
  return value.trim() === "" ? null : value
}

/**
 * Valida o corpo de uma receita (chaves em snake_case, como o front envia). Substitui todos os
 * campos (é usado na criação e na edição completa). Campos vazios viram `null`; `0` continua
 * sendo `0`; `active_customer` ausente conta como verdadeiro.
 */
export function parseRecipeBody(body: Record<string, unknown>): RecipeBodyResult {
  const title = typeof body.title === "string" ? body.title.trim() : ""
  const preparation = typeof body.preparation === "string" ? body.preparation.trim() : ""
  if (!title || !preparation || body.ingredients === undefined || body.ingredients === null) {
    return { ok: false, error: MISSING_ERROR }
  }
  if (title.length > MAX_TITLE_LENGTH) return { ok: false, error: "O título deve ter até 200 caracteres" }

  if (!Array.isArray(body.ingredients) || body.ingredients.some((item) => typeof item !== "string")) {
    return { ok: false, error: INGREDIENTS_ERROR }
  }
  const ingredients = (body.ingredients as string[]).map((item) => item.trim()).filter((item) => item !== "")
  if (ingredients.length === 0) return { ok: false, error: INGREDIENTS_ERROR }

  const description = parseOptionalText(body.description, 65_000)
  const tips = parseOptionalText(body.tips, 65_000)
  const category = parseOptionalText(body.category, MAX_CATEGORY_LENGTH)
  const imageUrl = parseOptionalText(body.image_url, 65_000)
  for (const [field, parsed] of [
    ["description", description],
    ["tips", tips],
    ["category", category],
    ["image_url", imageUrl],
  ] as const) {
    if (parsed === "invalid") return { ok: false, error: `${field} inválido` }
  }

  const integers = {
    prep_time: parseNumber(body.prep_time, { integer: true, max: MAX_INT }),
    servings: parseNumber(body.servings, { integer: true, max: MAX_INT }),
    calories: parseNumber(body.calories, { integer: true, max: MAX_INT }),
  }
  const decimals = {
    portion_quantity: parseNumber(body.portion_quantity, { integer: false, max: MAX_DECIMAL }),
    proteins: parseNumber(body.proteins, { integer: false, max: MAX_DECIMAL }),
    lipids: parseNumber(body.lipids, { integer: false, max: MAX_DECIMAL }),
    carbohydrates: parseNumber(body.carbohydrates, { integer: false, max: MAX_DECIMAL }),
    fiber: parseNumber(body.fiber, { integer: false, max: MAX_DECIMAL }),
  }
  for (const [field, parsed] of [...Object.entries(integers), ...Object.entries(decimals)]) {
    if (parsed === "invalid") return { ok: false, error: `${field} deve ser um número válido` }
  }

  if (body.active_customer !== undefined && typeof body.active_customer !== "boolean") {
    return { ok: false, error: "active_customer deve ser verdadeiro ou falso" }
  }

  return {
    ok: true,
    value: {
      title,
      description: description as string | null,
      ingredients,
      preparation,
      tips: tips as string | null,
      prepTime: integers.prep_time as number | null,
      servings: integers.servings as number | null,
      calories: integers.calories as number | null,
      category: category as string | null,
      imageUrl: imageUrl as string | null,
      portionQuantity: decimals.portion_quantity as number | null,
      proteins: decimals.proteins as number | null,
      lipids: decimals.lipids as number | null,
      carbohydrates: decimals.carbohydrates as number | null,
      fiber: decimals.fiber as number | null,
      activeCustomer: body.active_customer === undefined ? true : (body.active_customer as boolean),
    },
  }
}
