import { randomUUID } from "node:crypto"
import { desc, eq, like, or, type SQL } from "drizzle-orm"
import type { Db } from "@/lib/db/client"
import { mealPlans, notifications, passwordResetTokens, patients, payments, quizResponses } from "@/lib/db/schema"
import { onlyDigits } from "@/lib/validation/cpf"
import { affectedRows, escapeLike, isDuplicateEntry } from "./mysql-errors"
import type { PatientRepo, PatientRow } from "./types"

const columns = {
  id: patients.id,
  name: patients.name,
  cpf: patients.cpf,
  email: patients.email,
  phone: patients.phone,
  passwordHash: patients.passwordHash,
  mustChangePassword: patients.mustChangePassword,
  createdAt: patients.createdAt,
}

export function createPatientRepo(db: Db): PatientRepo {
  async function getById(id: string): Promise<PatientRow | null> {
    const [row] = await db.select(columns).from(patients).where(eq(patients.id, id)).limit(1)
    return row ?? null
  }

  return {
    getById,

    async findByCpf(cpf) {
      const [row] = await db.select(columns).from(patients).where(eq(patients.cpf, cpf)).limit(1)
      return row ?? null
    },

    async findByEmail(email) {
      return db.select(columns).from(patients).where(eq(patients.email, email)).limit(2)
    },

    async list(search) {
      const text = search.trim()
      let where: SQL | undefined
      if (text) {
        const pattern = `%${escapeLike(text)}%`
        const matches = [like(patients.name, pattern), like(patients.email, pattern)]
        // CPF digitado com pontuação ("529.982.247") casa pelos dígitos.
        const digits = onlyDigits(text)
        if (digits) matches.push(like(patients.cpf, `%${digits}%`))
        where = or(...matches)
      }
      return db.select(columns).from(patients).where(where).orderBy(desc(patients.createdAt))
    },

    async create(d) {
      const id = randomUUID()
      const now = new Date()
      try {
        await db.insert(patients).values({
          id,
          name: d.name,
          cpf: d.cpf,
          email: d.email,
          phone: d.phone,
          passwordHash: d.passwordHash,
          mustChangePassword: true,
          passwordSetAt: now,
          createdAt: now,
          updatedAt: now,
        })
      } catch (error) {
        if (isDuplicateEntry(error)) return "cpf_taken"
        throw error
      }
      return (await getById(id))!
    },

    async update(id, d) {
      await db
        .update(patients)
        .set({ name: d.name, email: d.email, phone: d.phone, updatedAt: new Date() })
        .where(eq(patients.id, id))
      return getById(id)
    },

    async setPassword(id, d) {
      const now = new Date()
      const result = await db
        .update(patients)
        .set({
          passwordHash: d.passwordHash,
          mustChangePassword: d.mustChangePassword,
          passwordSetAt: now,
          updatedAt: now,
        })
        .where(eq(patients.id, id))
      return affectedRows(result) > 0
    },

    async delete(id) {
      return db.transaction(async (tx) => {
        const [patient] = await tx.select({ id: patients.id }).from(patients).where(eq(patients.id, id)).for("update")
        if (!patient) return "not_found" as const

        const [payment] = await tx.select({ id: payments.id }).from(payments).where(eq(payments.patientId, id)).limit(1)
        const [quiz] = await tx
          .select({ id: quizResponses.id })
          .from(quizResponses)
          .where(eq(quizResponses.patientId, id))
          .limit(1)
        if (payment || quiz) return "has_history" as const

        await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.patientId, id))
        await tx.delete(notifications).where(eq(notifications.patientId, id))
        await tx.delete(mealPlans).where(eq(mealPlans.patientId, id))
        await tx.delete(patients).where(eq(patients.id, id))
        return "deleted" as const
      })
    },
  }
}
