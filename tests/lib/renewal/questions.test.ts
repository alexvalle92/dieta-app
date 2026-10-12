import { describe, expect, it } from "vitest"
import { RENEWAL_SECTIONS, type ChoiceQuestion, type NumberQuestion, type Question } from "@/lib/renewal/questions"

const all: Question[] = RENEWAL_SECTIONS.flatMap((s) => s.questions)
const byKey = (key: string): Question => {
  const q = all.find((item) => item.key === key)
  if (!q) throw new Error(`pergunta ${key} não existe`)
  return q
}
const choice = (key: string) => byKey(key) as ChoiceQuestion
const values = (key: string) => choice(key).options.map((o) => o.value)

describe("RENEWAL_SECTIONS", () => {
  it("quatro blocos, na ordem do spec, com as chaves de §8.1", () => {
    expect(RENEWAL_SECTIONS.map((s) => s.title)).toEqual(["Sobre você", "Peso", "Refeições", "Rotina"])
    expect(RENEWAL_SECTIONS.map((s) => s.questions.map((q) => q.key))).toEqual([
      ["faixa_etaria", "sexo_biologico", "altura_cm", "tipo_fisico", "peso_comportamento"],
      ["peso_kg", "meta_peso_30d"],
      ["breakfast_foods", "almoco", "lanche_tarde", "jantar", "sobremesa"],
      ["rotina_dia", "sono", "agua", "habitos"],
    ])
  })

  it.each([
    ["faixa_etaria", 4],
    ["sexo_biologico", 2],
    ["tipo_fisico", 4],
    ["peso_comportamento", 3],
    ["breakfast_foods", 7],
    ["almoco", 7],
    ["lanche_tarde", 7],
    ["jantar", 7],
    ["sobremesa", 2],
    ["rotina_dia", 3],
    ["sono", 4],
    ["agua", 4],
    ["habitos", 5],
  ])("%s tem %i opções", (key, count) => {
    expect(choice(key).options).toHaveLength(count)
  })

  it("valores exatos das opções que o formulário e o v0-tami-forms precisam reconhecer", () => {
    expect(values("faixa_etaria")).toEqual(["18-24 anos", "25-34 anos", "35-44 anos", "45-59 anos"])
    expect(values("sexo_biologico")).toEqual(["Masculino", "Feminino"])
    expect(values("sobremesa")).toEqual(["Sim", "Não"])
    expect(values("sono")).toContain("5–6 horas")
    expect(values("almoco")).toContain("Sem Feijão")
  })

  it("múltipla escolha: refeições e hábitos; as demais de escolha são single", () => {
    const multi = ["breakfast_foods", "almoco", "lanche_tarde", "jantar", "habitos"]
    const single = [
      "faixa_etaria",
      "sexo_biologico",
      "tipo_fisico",
      "peso_comportamento",
      "sobremesa",
      "rotina_dia",
      "sono",
      "agua",
    ]
    for (const key of multi) expect(byKey(key).type).toBe("multi")
    for (const key of single) expect(byKey(key).type).toBe("single")
  })

  it("limites dos números", () => {
    const altura = byKey("altura_cm") as NumberQuestion
    const peso = byKey("peso_kg") as NumberQuestion
    const meta = byKey("meta_peso_30d") as NumberQuestion
    expect(altura).toMatchObject({ type: "number", min: 120, max: 230, step: 1 })
    expect(peso).toMatchObject({ type: "number", min: 30, max: 300, step: 0.1 })
    expect(meta).toMatchObject({ type: "number", min: 30, max: 300, step: 0.1 })
  })

  it("toda pergunta tem texto, e toda opção tem value e label", () => {
    for (const q of all) {
      expect(q.label.trim()).not.toBe("")
      if (q.type === "number") continue
      for (const o of q.options) {
        expect(o.value.trim()).not.toBe("")
        expect(o.label.trim()).not.toBe("")
      }
    }
  })
})
