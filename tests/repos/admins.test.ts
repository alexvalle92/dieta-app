import { randomUUID } from "node:crypto"
import type mysql from "mysql2/promise"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { createAdminRepo } from "@/lib/repos/admins"
import type { AdminRepo } from "@/lib/repos/types"
import { mysqlTestsEnabled, openTestDb, truncateAll } from "../helpers/test-db"

describe.skipIf(!mysqlTestsEnabled)("AdminRepo (MySQL)", () => {
  let pool: mysql.Pool
  let repo: AdminRepo

  beforeAll(async () => {
    const opened = await openTestDb()
    pool = opened.pool
    repo = createAdminRepo(opened.db)
  }, 60_000)

  beforeEach(async () => {
    await truncateAll(pool)
  })

  afterAll(async () => {
    await pool?.end()
  })

  it("count: 0 sem admin e 1 depois do primeiro", async () => {
    expect(await repo.count()).toBe(0)
    expect(await repo.create({ name: "Admin", email: "admin@example.com", passwordHash: "h" })).toBe("created")
    expect(await repo.count()).toBe(1)
  })

  it("create com o mesmo e-mail → email_taken", async () => {
    await repo.create({ name: "Admin", email: "admin@example.com", passwordHash: "h" })
    expect(await repo.create({ name: "Outro", email: "admin@example.com", passwordHash: "h2" })).toBe("email_taken")
    expect(await repo.count()).toBe(1)
  })

  it("findByEmail e getById devolvem o admin; desconhecidos → null", async () => {
    await repo.create({ name: "Admin", email: "admin@example.com", passwordHash: "h" })

    const found = await repo.findByEmail("admin@example.com")
    expect(found).toMatchObject({ name: "Admin", email: "admin@example.com", passwordHash: "h" })
    expect((await repo.getById(found!.id))?.email).toBe("admin@example.com")
    expect(await repo.findByEmail("ninguem@example.com")).toBeNull()
    expect(await repo.getById(randomUUID())).toBeNull()
  })

  it("setPassword troca o hash; id inexistente → false", async () => {
    await repo.create({ name: "Admin", email: "admin@example.com", passwordHash: "antigo" })
    const admin = (await repo.findByEmail("admin@example.com"))!

    expect(await repo.setPassword(admin.id, "novo")).toBe(true)
    expect((await repo.getById(admin.id))?.passwordHash).toBe("novo")
    expect(await repo.setPassword(randomUUID(), "x")).toBe(false)
  })
})
