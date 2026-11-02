import { describe, expect, it } from "vitest"
import { expiryLabel } from "@/lib/client/expiry-label"

describe("expiryLabel", () => {
  it.each([
    [12, "Vence em 12 dias"],
    [2, "Vence em 2 dias"],
    [1, "Vence em 1 dia"],
    [0, "Vence hoje"],
    [-1, "Vencido"],
    [-30, "Vencido"],
  ])("%d → %s", (days, label) => {
    expect(expiryLabel(days)).toBe(label)
  })

  it("sem data de fim → null", () => {
    expect(expiryLabel(null)).toBeNull()
  })
})
