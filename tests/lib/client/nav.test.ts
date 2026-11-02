import { describe, expect, it } from "vitest"
import { activeTab } from "@/lib/client/nav"

describe("activeTab", () => {
  it.each([
    ["/cliente/dashboard", "inicio"],
    ["/cliente/meu-plano", "plano"],
    ["/cliente/planos", "plano"],
    ["/cliente/planos/abc", "plano"],
    ["/cliente/planos/abc/renovar", "plano"],
    ["/cliente/receitas", "receitas"],
    ["/cliente/receitas/42", "receitas"],
    ["/cliente/meus-dados", null],
    ["/cliente/planosx", null],
    ["/cliente/receitas-antigas", null],
  ])("%s → %s", (path, tab) => {
    expect(activeTab(path)).toBe(tab)
  })
})
