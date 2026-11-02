import { describe, expect, it } from "vitest"
import { noActivePlanMessage } from "@/lib/client/no-plan-message"

describe("noActivePlanMessage", () => {
  it("quem nunca teve plano: ainda não foi criado", () => {
    expect(noActivePlanMessage(0)).toEqual({
      title: "Nenhum plano alimentar encontrado",
      description: "Seu nutricionista ainda não criou nenhum plano alimentar para você.",
    })
  })

  it("quem já teve plano: não tem um ativo agora, sem dizer que nunca teve", () => {
    const message = noActivePlanMessage(2)
    expect(message.title).toBe("Você não tem um plano ativo no momento")
    expect(message.description).toBeNull()
  })
})
