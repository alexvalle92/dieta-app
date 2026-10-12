import { existsSync } from "node:fs"
import path from "node:path"
import { migrate } from "drizzle-orm/mysql2/migrator"
import type mysql from "mysql2/promise"
import { createDb, type Db } from "@/lib/db/client"

// Os testes de repositório rodam num MySQL 8 real e TRUNCAM as tabelas. Por isso só rodam com
// TEST_DATABASE_URL apontando para um banco descartável (nome com "test") e com o v0-tami-forms
// ao lado, de onde vêm as migrations: este app não cria tabela.
const url = process.env.TEST_DATABASE_URL
const migrationsDir = path.resolve(process.cwd(), "../v0-tami-forms/lib/db/migrations")

export const mysqlTestsEnabled = Boolean(url) && existsSync(migrationsDir)

function assertDisposableDatabase(connectionUrl: string): void {
  const name = new URL(connectionUrl).pathname.replace(/^\//, "")
  if (!/test/i.test(name)) {
    throw new Error(`TEST_DATABASE_URL deve apontar para um banco de teste (nome com "test"); recebeu "${name}"`)
  }
}

/** Abre o banco de teste e aplica as migrations do v0-tami-forms (idempotente). */
export async function openTestDb(): Promise<{ db: Db; pool: mysql.Pool }> {
  if (!url) throw new Error("TEST_DATABASE_URL não definida")
  assertDisposableDatabase(url)
  const { db, pool } = createDb(url)
  await migrate(db, { migrationsFolder: migrationsDir })
  return { db, pool }
}

/** Esvazia todas as tabelas (menos a de controle das migrations), numa conexão só. */
export async function truncateAll(pool: mysql.Pool): Promise<void> {
  const connection = await pool.getConnection()
  try {
    await connection.query("SET FOREIGN_KEY_CHECKS=0")
    const [rows] = await connection.query<mysql.RowDataPacket[]>(
      "SELECT table_name AS name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name <> '__drizzle_migrations'",
    )
    for (const row of rows) await connection.query(`TRUNCATE TABLE \`${row.name}\``)
  } finally {
    await connection.query("SET FOREIGN_KEY_CHECKS=1")
    connection.release()
  }
}
