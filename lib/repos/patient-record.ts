import { desc, eq } from "drizzle-orm"
import type { Db } from "@/lib/db/client"
import { mealPlans, notifications, patients, payments, quizResponses } from "@/lib/db/schema"
import type { PatientRecord, PatientRecordRepo } from "./types"

/**
 * Cadastro completo para a tela do admin. As colunas são escolhidas uma a uma: o hash da senha só
 * vira o booleano `hasPassword`, e `notifications.payload` (link de redefinição), `last_error` e
 * o cliente do Asaas nunca saem do banco para esta tela.
 */
export function createPatientRecordRepo(db: Db): PatientRecordRepo {
  return {
    async get(patientId): Promise<PatientRecord | null> {
      const [patient] = await db
        .select({
          id: patients.id,
          name: patients.name,
          cpf: patients.cpf,
          email: patients.email,
          phone: patients.phone,
          createdAt: patients.createdAt,
          passwordHash: patients.passwordHash,
          mustChangePassword: patients.mustChangePassword,
        })
        .from(patients)
        .where(eq(patients.id, patientId))
        .limit(1)
      if (!patient) return null

      const [quizRows, paymentRows, planRows, notificationRows] = await Promise.all([
        db
          .select({ id: quizResponses.id, createdAt: quizResponses.createdAt, answers: quizResponses.answers })
          .from(quizResponses)
          .where(eq(quizResponses.patientId, patientId))
          .orderBy(desc(quizResponses.createdAt)),
        db
          .select({
            id: payments.id,
            amount: payments.amount,
            status: payments.status,
            dueDate: payments.dueDate,
            paidAt: payments.paidAt,
            billingType: payments.billingType,
            paymentUrl: payments.paymentUrl,
            createdAt: payments.createdAt,
          })
          .from(payments)
          .where(eq(payments.patientId, patientId))
          .orderBy(desc(payments.createdAt)),
        db
          .select({
            id: mealPlans.id,
            title: mealPlans.title,
            startDate: mealPlans.startDate,
            endDate: mealPlans.endDate,
            status: mealPlans.status,
            paymentId: mealPlans.paymentId,
            createdAt: mealPlans.createdAt,
          })
          .from(mealPlans)
          .where(eq(mealPlans.patientId, patientId))
          .orderBy(desc(mealPlans.createdAt)),
        db
          .select({
            id: notifications.id,
            channel: notifications.channel,
            kind: notifications.kind,
            status: notifications.status,
            attempts: notifications.attempts,
            sentAt: notifications.sentAt,
            createdAt: notifications.createdAt,
          })
          .from(notifications)
          .where(eq(notifications.patientId, patientId))
          .orderBy(desc(notifications.createdAt)),
      ])

      return {
        patient: {
          id: patient.id,
          name: patient.name,
          cpf: patient.cpf,
          email: patient.email,
          phone: patient.phone,
          createdAt: patient.createdAt,
          hasPassword: patient.passwordHash !== null,
          mustChangePassword: patient.mustChangePassword,
        },
        quizResponses: quizRows.map((q) => ({
          id: q.id,
          createdAt: q.createdAt,
          answers: (q.answers ?? {}) as Record<string, unknown>,
        })),
        payments: paymentRows,
        mealPlans: planRows.map(({ paymentId, ...plan }) => ({
          ...plan,
          origin: paymentId ? ("ai" as const) : ("admin" as const),
        })),
        notifications: notificationRows,
      }
    },
  }
}
