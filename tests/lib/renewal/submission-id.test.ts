import { describe, expect, it, vi } from "vitest"
import { z } from "zod"
import { newSubmissionId } from "@/lib/renewal/submission-id"

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

/** `crypto` de um contexto não seguro (HTTP num IP da rede): sem `randomUUID`, só `getRandomValues`. */
const insecureCrypto = () => ({
  getRandomValues: (array: Uint8Array) => globalThis.crypto.getRandomValues(array),
})

describe("newSubmissionId", () => {
  it("usa crypto.randomUUID quando existe", () => {
    const randomUUID = vi.fn(() => "3f1c2d4e-5b6a-4c7d-8e9f-0a1b2c3d4e5f")
    expect(newSubmissionId({ ...insecureCrypto(), randomUUID })).toBe("3f1c2d4e-5b6a-4c7d-8e9f-0a1b2c3d4e5f")
    expect(randomUUID).toHaveBeenCalledTimes(1)
  })

  it("sem randomUUID (contexto não seguro): gera um UUID v4 com getRandomValues", () => {
    const ids = new Set<string>()
    for (let i = 0; i < 50; i++) {
      const id = newSubmissionId(insecureCrypto())
      expect(id).toMatch(UUID_V4)
      // O mesmo formato que a rota de renovação valida.
      expect(z.string().uuid().safeParse(id).success).toBe(true)
      ids.add(id)
    }
    expect(ids.size).toBe(50)
  })

  it("randomUUID que lança: cai no gerador com getRandomValues", () => {
    const randomUUID = () => {
      throw new TypeError("crypto.randomUUID is not a function")
    }
    expect(newSubmissionId({ ...insecureCrypto(), randomUUID })).toMatch(UUID_V4)
  })

  it("sem argumento usa o crypto global", () => {
    expect(newSubmissionId()).toMatch(UUID_V4)
  })
})
