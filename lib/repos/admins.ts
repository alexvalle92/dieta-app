import { randomUUID } from "node:crypto"
import { count, eq } from "drizzle-orm"
import type { Db } from "@/lib/db/client"
import { admins } from "@/lib/db/schema"
import { affectedRows, isDuplicateEntry } from "./mysql-errors"
import type { AdminRepo } from "./types"

const columns = {
  id: admins.id,
  name: admins.name,
  email: admins.email,
  passwordHash: admins.passwordHash,
}

export function createAdminRepo(db: Db): AdminRepo {
  return {
    async findByEmail(email) {
      const [row] = await db.select(columns).from(admins).where(eq(admins.email, email)).limit(1)
      return row ?? null
    },

    async getById(id) {
      const [row] = await db.select(columns).from(admins).where(eq(admins.id, id)).limit(1)
      return row ?? null
    },

    async count() {
      const [row] = await db.select({ total: count() }).from(admins)
      return Number(row?.total ?? 0)
    },

    async create(d) {
      const now = new Date()
      try {
        await db.insert(admins).values({
          id: randomUUID(),
          name: d.name,
          email: d.email,
          passwordHash: d.passwordHash,
          createdAt: now,
          updatedAt: now,
        })
      } catch (error) {
        if (isDuplicateEntry(error)) return "email_taken"
        throw error
      }
      return "created"
    },

    async setPassword(id, passwordHash) {
      const result = await db
        .update(admins)
        .set({ passwordHash, updatedAt: new Date() })
        .where(eq(admins.id, id))
      return affectedRows(result) > 0
    },
  }
}
