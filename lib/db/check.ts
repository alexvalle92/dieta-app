import { is, sql } from "drizzle-orm"
import { MySqlTable, getTableConfig } from "drizzle-orm/mysql-core"
import type { Db } from "./client"
import * as schema from "./schema"

export type ColumnRef = { table: string; column: string }

/** Toda coluna que o schema declara, com o nome real no banco. */
export function expectedColumns(): ColumnRef[] {
  const refs: ColumnRef[] = []
  for (const value of Object.values(schema)) {
    if (!is(value, MySqlTable)) continue
    const config = getTableConfig(value)
    for (const column of config.columns) refs.push({ table: config.name, column: column.name })
  }
  return refs
}

/**
 * O que falta no banco: o nome da tabela (uma vez) quando ela não existe, ou `tabela.coluna` quando só
 * a coluna falta. Tabelas e colunas a mais no banco não são problema.
 */
export function findSchemaGaps(expected: ColumnRef[], actual: ColumnRef[]): string[] {
  const tables = new Set(actual.map((c) => c.table))
  const columns = new Set(actual.map((c) => `${c.table}.${c.column}`))
  const gaps = new Set<string>()
  for (const { table, column } of expected) {
    if (!tables.has(table)) gaps.add(table)
    else if (!columns.has(`${table}.${column}`)) gaps.add(`${table}.${column}`)
  }
  return [...gaps]
}

/** Confere o banco real contra o schema: devolve o que falta (vazio = pronto). */
export async function checkDatabase(db: Db): Promise<string[]> {
  const [rows] = await db.execute(
    sql`SELECT table_name AS tableName, column_name AS columnName FROM information_schema.columns WHERE table_schema = DATABASE()`,
  )
  const actual = (rows as unknown as { tableName: string; columnName: string }[]).map((r) => ({
    table: r.tableName,
    column: r.columnName,
  }))
  return findSchemaGaps(expectedColumns(), actual)
}
