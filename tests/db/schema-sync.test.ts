import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

// O schema do v0-tami-forms é a fonte; este repositório guarda uma cópia (pnpm db:sync-schema).
const sibling = path.resolve(process.cwd(), "../v0-tami-forms/lib/db/schema.ts")
const mine = path.resolve(process.cwd(), "lib/db/schema.ts")
const normalize = (text: string) => text.replace(/\r\n/g, "\n")

describe("schema compartilhado", () => {
  it.skipIf(!existsSync(sibling))("lib/db/schema.ts é idêntico ao do v0-tami-forms", () => {
    expect(normalize(readFileSync(mine, "utf8"))).toBe(normalize(readFileSync(sibling, "utf8")))
  })

  it("a cópia traz as tabelas do PlanA e a fila de mensagens sem quiz", () => {
    const text = readFileSync(mine, "utf8")
    for (const table of ["admins", "password_reset_tokens", "recipes", "meal_categories", "allowed_meal_items", "app_settings"]) {
      expect(text).toContain(`"${table}"`)
    }
    expect(text).toContain('payload: json("payload")')
  })
})
