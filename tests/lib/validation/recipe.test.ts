import { describe, expect, it } from "vitest"
import { parseRecipeBody } from "@/lib/validation/recipe"

const valid = {
  title: "Frango grelhado",
  ingredients: ["Peito de frango", "Limão"],
  preparation: "Grelhe por 10 minutos.",
}

const MISSING = "Campos obrigatórios: title, ingredients, preparation"
const INGREDIENTS = "Ingredientes deve ser um array não vazio"

describe("parseRecipeBody", () => {
  it("só os obrigatórios: o resto vira null e a receita fica ativa para o cliente", () => {
    expect(parseRecipeBody(valid)).toEqual({
      ok: true,
      value: {
        title: "Frango grelhado",
        description: null,
        ingredients: ["Peito de frango", "Limão"],
        preparation: "Grelhe por 10 minutos.",
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
    })
  })

  it("converte as chaves snake_case e mantém 0 como número (não vira null)", () => {
    const result = parseRecipeBody({
      ...valid,
      description: "Leve",
      tips: "Sirva quente",
      category: "Almoço",
      image_url: "https://img.example/x.png",
      prep_time: 20,
      servings: 2,
      calories: 320,
      portion_quantity: 150,
      proteins: 12.5,
      lipids: 0,
      carbohydrates: "3,5",
      fiber: 0,
      active_customer: false,
    })

    expect(result).toMatchObject({
      ok: true,
      value: {
        description: "Leve",
        tips: "Sirva quente",
        category: "Almoço",
        imageUrl: "https://img.example/x.png",
        prepTime: 20,
        servings: 2,
        calories: 320,
        portionQuantity: 150,
        proteins: 12.5,
        lipids: 0,
        carbohydrates: 3.5,
        fiber: 0,
        activeCustomer: false,
      },
    })
  })

  it.each([
    ["sem título", { title: undefined }],
    ["título só de espaços", { title: "   " }],
    ["sem preparo", { preparation: "" }],
    ["sem ingredientes", { ingredients: undefined }],
  ])("%s → campos obrigatórios", (_name, override) => {
    expect(parseRecipeBody({ ...valid, ...override })).toEqual({ ok: false, error: MISSING })
  })

  it.each([
    ["lista vazia", []],
    ["texto em vez de lista", "farinha"],
    ["só itens em branco", ["", "  "]],
    ["item que não é texto", ["farinha", 3]],
  ])("ingredientes: %s → erro", (_name, ingredients) => {
    expect(parseRecipeBody({ ...valid, ingredients })).toEqual({ ok: false, error: INGREDIENTS })
  })

  it("apara os ingredientes e descarta os em branco", () => {
    const result = parseRecipeBody({ ...valid, ingredients: [" Farinha ", "", "Ovo"] })
    expect(result).toMatchObject({ ok: true, value: { ingredients: ["Farinha", "Ovo"] } })
  })

  it.each([
    ["prep_time", -1],
    ["servings", 1.5],
    ["calories", "muitas"],
    ["proteins", -0.1],
    ["fiber", "abc"],
    ["lipids", 1e12],
  ])("%s = %j → erro de número", (field, value) => {
    const result = parseRecipeBody({ ...valid, [field]: value })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain(field)
  })

  it("título com mais de 200 caracteres → erro", () => {
    expect(parseRecipeBody({ ...valid, title: "T".repeat(201) })).toEqual({
      ok: false,
      error: "O título deve ter até 200 caracteres",
    })
  })

  it("active_customer que não é booleano → erro", () => {
    const result = parseRecipeBody({ ...valid, active_customer: "sim" })
    expect(result.ok).toBe(false)
  })
})
