import { randomUUID } from "node:crypto"
import { and, desc, eq, ne } from "drizzle-orm"
import type { Db } from "@/lib/db/client"
import { mealPlans, notifications, patients, planGenerations } from "@/lib/db/schema"
import type { MealPlanInput, MealPlanRepo, MealPlanRow, MealPlanWithPatient } from "./types"

const planColumns = {
  id: mealPlans.id,
  patientId: mealPlans.patientId,
  title: mealPlans.title,
  description: mealPlans.description,
  startDate: mealPlans.startDate,
  endDate: mealPlans.endDate,
  status: mealPlans.status,
  planData: mealPlans.planData,
  createdAt: mealPlans.createdAt,
  updatedAt: mealPlans.updatedAt,
}

const withPatientColumns = {
  ...planColumns,
  patient: { id: patients.id, name: patients.name, email: patients.email, cpf: patients.cpf },
}

export function createMealPlanRepo(db: Db): MealPlanRepo {
  async function get(id: string): Promise<MealPlanWithPatient | null> {
    const [row] = await db
      .select(withPatientColumns)
      .from(mealPlans)
      .leftJoin(patients, eq(patients.id, mealPlans.patientId))
      .where(eq(mealPlans.id, id))
      .limit(1)
    return row ?? null
  }

  return {
    get,

    async listByPatient(patientId): Promise<MealPlanRow[]> {
      return db.select(planColumns).from(mealPlans).where(eq(mealPlans.patientId, patientId)).orderBy(desc(mealPlans.createdAt))
    },

    async getForPatient(id, patientId) {
      const [row] = await db
        .select(planColumns)
        .from(mealPlans)
        .where(and(eq(mealPlans.id, id), eq(mealPlans.patientId, patientId)))
        .limit(1)
      return row ?? null
    },

    async listAll() {
      return db
        .select(withPatientColumns)
        .from(mealPlans)
        .leftJoin(patients, eq(patients.id, mealPlans.patientId))
        .orderBy(desc(mealPlans.createdAt))
    },

    async create(d: MealPlanInput, now) {
      const id = randomUUID()

      const outcome = await db.transaction(async (tx) => {
        const [patient] = await tx.select({ id: patients.id }).from(patients).where(eq(patients.id, d.patientId)).for("update")
        if (!patient) return "patient_not_found" as const

        // Um paciente nunca tem dois planos ativos: o novo plano ativo conclui os anteriores.
        if (d.status === "active") {
          await tx
            .update(mealPlans)
            .set({ status: "completed", updatedAt: now })
            .where(and(eq(mealPlans.patientId, d.patientId), eq(mealPlans.status, "active")))
        }

        await tx.insert(mealPlans).values({
          id,
          patientId: d.patientId,
          title: d.title,
          description: d.description,
          startDate: d.startDate,
          endDate: d.endDate,
          status: d.status,
          planData: d.planData,
          createdAt: now,
          updatedAt: now,
        })
        return "created" as const
      })

      if (outcome === "patient_not_found") return outcome
      return (await get(id))!
    },

    async update(id, d, now) {
      const outcome = await db.transaction(async (tx) => {
        const [existing] = await tx
          .select({ patientId: mealPlans.patientId, status: mealPlans.status })
          .from(mealPlans)
          .where(eq(mealPlans.id, id))
          .for("update")
        if (!existing) return "not_found" as const

        const patientId = d.patientId ?? existing.patientId
        const patientChanged = patientId !== existing.patientId
        if (patientChanged) {
          const [patient] = await tx.select({ id: patients.id }).from(patients).where(eq(patients.id, patientId))
          if (!patient) return "patient_not_found" as const
        }

        const status = d.status ?? existing.status
        // O plano que fica ativo (por mudança de status ou de paciente) conclui os outros do paciente.
        if (status === "active" && (d.status !== undefined || patientChanged)) {
          await tx
            .update(mealPlans)
            .set({ status: "completed", updatedAt: now })
            .where(and(eq(mealPlans.patientId, patientId), eq(mealPlans.status, "active"), ne(mealPlans.id, id)))
        }

        await tx
          .update(mealPlans)
          .set({
            ...(d.patientId !== undefined ? { patientId: d.patientId } : {}),
            ...(d.title !== undefined ? { title: d.title } : {}),
            ...(d.description !== undefined ? { description: d.description } : {}),
            ...(d.startDate !== undefined ? { startDate: d.startDate } : {}),
            ...(d.endDate !== undefined ? { endDate: d.endDate } : {}),
            ...(d.status !== undefined ? { status: d.status } : {}),
            ...(d.planData !== undefined ? { planData: d.planData } : {}),
            updatedAt: now,
          })
          .where(eq(mealPlans.id, id))
        return "updated" as const
      })

      if (outcome !== "updated") return outcome
      return (await get(id))!
    },

    async delete(id) {
      const [plan] = await db.select({ id: mealPlans.id }).from(mealPlans).where(eq(mealPlans.id, id)).limit(1)
      if (!plan) return "not_found"

      const [generation] = await db
        .select({ id: planGenerations.id })
        .from(planGenerations)
        .where(eq(planGenerations.mealPlanId, id))
        .limit(1)
      if (generation) return "in_use"

      // Os avisos de vencimento do plano (FK `notifications.meal_plan_id`) saem junto com ele.
      await db.transaction(async (tx) => {
        await tx.delete(notifications).where(eq(notifications.mealPlanId, id))
        await tx.delete(mealPlans).where(eq(mealPlans.id, id))
      })
      return "deleted"
    },
  }
}
