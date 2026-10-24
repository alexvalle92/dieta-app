import { and, count, desc, eq, gte, inArray, lt } from "drizzle-orm"
import type { Db } from "@/lib/db/client"
import { appLogs, notifications, patients, payments, planGenerations } from "@/lib/db/schema"
import type { AppLogFilter, FailedItem, FailedLastError, FailuresRepo } from "./types"

export const FAILED_LIMIT_PER_TYPE = 200
export const APP_LOGS_PAGE_SIZE = 50

/**
 * `last_error` vem de outro app e de versões antigas: só `step` e `message` (texto) são obrigatórios; os
 * demais campos entram quando têm o tipo certo e somem quando não têm.
 */
export function toFailedLastError(raw: unknown): FailedLastError | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null
  const r = raw as Record<string, unknown>
  if (typeof r.step !== "string" || typeof r.message !== "string") return null
  return {
    step: r.step,
    message: r.message,
    ...(typeof r.attempt === "number" ? { attempt: r.attempt } : {}),
    ...(typeof r.at === "string" ? { at: r.at } : {}),
    ...(typeof r.httpStatus === "number" ? { httpStatus: r.httpStatus } : {}),
    ...(typeof r.responseBody === "string" ? { responseBody: r.responseBody } : {}),
  }
}

export function createFailuresRepo(db: Db): FailuresRepo {
  const patientColumns = { patientId: patients.id, patientName: patients.name, patientEmail: patients.email }
  const patientOf = (r: { patientId: string; patientName: string; patientEmail: string }) => ({
    id: r.patientId,
    name: r.patientName,
    email: r.patientEmail,
  })

  return {
    async listFailed() {
      const [paymentRows, generationRows, notificationRows] = await Promise.all([
        db
          .select({
            id: payments.id,
            attempts: payments.syncAttempts,
            lastError: payments.lastError,
            createdAt: payments.createdAt,
            updatedAt: payments.updatedAt,
            ...patientColumns,
          })
          .from(payments)
          .innerJoin(patients, eq(patients.id, payments.patientId))
          .where(eq(payments.status, "ASAAS_FAILED"))
          .orderBy(desc(payments.updatedAt))
          .limit(FAILED_LIMIT_PER_TYPE),
        db
          .select({
            id: planGenerations.id,
            attempts: planGenerations.attempts,
            lastError: planGenerations.lastError,
            createdAt: planGenerations.createdAt,
            updatedAt: planGenerations.updatedAt,
            ...patientColumns,
          })
          .from(planGenerations)
          .innerJoin(patients, eq(patients.id, planGenerations.patientId))
          .where(eq(planGenerations.status, "failed"))
          .orderBy(desc(planGenerations.updatedAt))
          .limit(FAILED_LIMIT_PER_TYPE),
        db
          .select({
            id: notifications.id,
            attempts: notifications.attempts,
            lastError: notifications.lastError,
            createdAt: notifications.createdAt,
            updatedAt: notifications.updatedAt,
            channel: notifications.channel,
            kind: notifications.kind,
            ...patientColumns,
          })
          .from(notifications)
          .innerJoin(patients, eq(patients.id, notifications.patientId))
          .where(eq(notifications.status, "failed"))
          .orderBy(desc(notifications.updatedAt))
          .limit(FAILED_LIMIT_PER_TYPE),
      ])

      const items: FailedItem[] = [
        ...paymentRows.map((r) => ({
          type: "payment" as const,
          id: r.id,
          patient: patientOf(r),
          lastError: toFailedLastError(r.lastError),
          attempts: r.attempts,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        })),
        ...generationRows.map((r) => ({
          type: "plan_generation" as const,
          id: r.id,
          patient: patientOf(r),
          lastError: toFailedLastError(r.lastError),
          attempts: r.attempts,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        })),
        ...notificationRows.map((r) => ({
          type: "notification" as const,
          id: r.id,
          patient: patientOf(r),
          lastError: toFailedLastError(r.lastError),
          attempts: r.attempts,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
          channel: r.channel,
          kind: r.kind,
        })),
      ]
      return items.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    },

    async listAppLogs(f: AppLogFilter) {
      const inPeriodAndLevel = and(gte(appLogs.ts, f.from), lt(appLogs.ts, f.to), inArray(appLogs.level, f.levels))
      const where = f.area ? and(inPeriodAndLevel, eq(appLogs.area, f.area)) : inPeriodAndLevel

      const [rows, totals, areas] = await Promise.all([
        db
          .select()
          .from(appLogs)
          .where(where)
          .orderBy(desc(appLogs.ts), desc(appLogs.id))
          .limit(APP_LOGS_PAGE_SIZE)
          .offset((f.page - 1) * APP_LOGS_PAGE_SIZE),
        db.select({ n: count() }).from(appLogs).where(where),
        db.selectDistinct({ area: appLogs.area }).from(appLogs).where(inPeriodAndLevel).orderBy(appLogs.area),
      ])

      return {
        rows: rows.map((r) => ({ id: r.id, ts: r.ts, level: r.level, event: r.event, area: r.area, fields: r.fields })),
        total: Number(totals[0]?.n ?? 0),
        areas: areas.map((a) => a.area),
      }
    },
  }
}
