import { describe, expect, it } from "vitest"
import { expectedColumns, findSchemaGaps, type ColumnRef } from "@/lib/db/check"

describe("expectedColumns", () => {
  it("lista as colunas de todas as tabelas do schema, com o nome real no banco", () => {
    const columns = expectedColumns()

    expect(columns).toContainEqual({ table: "notifications", column: "patient_id" })
    expect(columns).toContainEqual({ table: "admins", column: "password_hash" })
    expect(columns).toContainEqual({ table: "password_reset_tokens", column: "token_hash" })
    expect(columns).toContainEqual({ table: "patients", column: "must_change_password" })
    expect(columns).toContainEqual({ table: "app_settings", column: "diet_technical_definition" })
  })
})

describe("findSchemaGaps", () => {
  const expected: ColumnRef[] = [
    { table: "admins", column: "id" },
    { table: "admins", column: "password_hash" },
    { table: "notifications", column: "id" },
    { table: "notifications", column: "patient_id" },
  ]

  it("tudo presente → nada falta (colunas a mais no banco não incomodam)", () => {
    const actual: ColumnRef[] = [...expected, { table: "outra", column: "x" }]
    expect(findSchemaGaps(expected, actual)).toEqual([])
  })

  it("tabela ausente → uma entrada só, com o nome da tabela", () => {
    const actual = expected.filter((c) => c.table !== "admins")
    expect(findSchemaGaps(expected, actual)).toEqual(["admins"])
  })

  it("coluna ausente → tabela.coluna", () => {
    const actual = expected.filter((c) => c.column !== "patient_id")
    expect(findSchemaGaps(expected, actual)).toEqual(["notifications.patient_id"])
  })

  it("banco sem nenhuma tabela → todas as tabelas esperadas, uma vez cada", () => {
    expect(findSchemaGaps(expected, [])).toEqual(["admins", "notifications"])
  })
})
