import { randomUUID } from "node:crypto"
import type { Db } from "@/lib/db/client"
import { mealPlans, patients, payments, planGenerations, quizResponses } from "@/lib/db/schema"

/** 11 dígitos aleatórios: serve de CPF único nos testes de repositório (que não validam o CPF). */
export function randomCpf(): string {
  return Array.from({ length: 11 }, () => Math.floor(Math.random() * 10)).join("")
}

export type QuizPatientIds = { patientId: string; paymentId: string; quizResponseId: string }

/** Paciente como o quiz grava: sem senha, com uma cobrança `PENDING` e um envio do quiz ligado a ela. */
export async function seedQuizPatient(
  db: Db,
  over: { cpf?: string; email?: string; phone?: string; name?: string } = {},
): Promise<QuizPatientIds> {
  const patientId = randomUUID()
  const paymentId = randomUUID()
  const quizResponseId = randomUUID()

  await db.insert(patients).values({
    id: patientId,
    name: over.name ?? "Paciente do Quiz",
    cpf: over.cpf ?? randomCpf(),
    email: over.email ?? `quiz-${patientId}@example.com`,
    phone: over.phone ?? "11987654321",
  })
  await db.insert(payments).values({ id: paymentId, patientId, amount: "39.90", status: "PENDING" })
  await db.insert(quizResponses).values({
    id: quizResponseId,
    submissionId: randomUUID(),
    patientId,
    answers: { peso_kg: "70" },
    firstQuiz: true,
    paymentId,
  })
  return { patientId, paymentId, quizResponseId }
}

/** Plano `active` gerado por pagamento, com a linha `done` em `plan_generations` apontando para ele. */
export async function seedGeneratedPlan(db: Db, ids: QuizPatientIds): Promise<{ mealPlanId: string }> {
  const mealPlanId = randomUUID()
  await db.insert(mealPlans).values({
    id: mealPlanId,
    patientId: ids.patientId,
    paymentId: ids.paymentId,
    quizResponseId: ids.quizResponseId,
    title: "Plano Alimentar 10/2026",
    startDate: "2026-10-12",
    endDate: "2026-11-11",
    status: "active",
    planData: { meals: [], calories: 1800, observations: "" },
  })
  await db.insert(planGenerations).values({
    id: randomUUID(),
    paymentId: ids.paymentId,
    patientId: ids.patientId,
    quizResponseId: ids.quizResponseId,
    status: "done",
    mealPlanId,
  })
  return { mealPlanId }
}
