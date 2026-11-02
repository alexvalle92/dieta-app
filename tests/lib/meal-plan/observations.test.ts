import { describe, expect, it } from "vitest"
import { observationLines } from "@/lib/meal-plan/options"

describe("observationLines", () => {
  it("uma linha por observação, sem as vazias", () => {
    expect(observationLines(" Beba água \n\n Caminhe ")).toEqual(["Beba água", "Caminhe"])
  })

  it("valor que não é texto vira lista vazia, sem quebrar", () => {
    expect(observationLines(42)).toEqual([])
    expect(observationLines({ texto: "x" })).toEqual([])
    expect(observationLines(undefined)).toEqual([])
  })
})
