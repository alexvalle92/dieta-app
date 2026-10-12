import { describe, expect, it } from "vitest"
import { growthPercentage } from "@/lib/services/growth"

describe("growthPercentage", () => {
  it.each([
    [10, 5, 100],
    [5, 10, -50],
    [3, 0, 100],
    [0, 0, 0],
    [0, 4, -100],
    [1, 3, -67],
    [4, 3, 33],
  ])("este mês %i, mês passado %i → %i%%", (thisMonth, lastMonth, expected) => {
    expect(growthPercentage(thisMonth, lastMonth)).toBe(expected)
  })
})
