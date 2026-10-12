import { createHash } from "node:crypto"
import { describe, expect, it } from "vitest"
import { hashResetToken, newResetToken } from "@/lib/auth/reset-token"

describe("reset-token", () => {
  it("o token tem 43 caracteres base64url e o hash é o SHA-256 em hexadecimal", () => {
    const { token, hash } = newResetToken()
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
    expect(hash).toBe(createHash("sha256").update(token).digest("hex"))
    expect(hashResetToken(token)).toBe(hash)
  })

  it("duas chamadas dão tokens diferentes", () => {
    expect(newResetToken().token).not.toBe(newResetToken().token)
  })
})
