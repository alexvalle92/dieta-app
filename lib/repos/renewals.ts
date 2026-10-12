import { and, desc, eq, gt } from "drizzle-orm"
import type { Db } from "@/lib/db/client"
import { payments, quizResponses } from "@/lib/db/schema"
import type { RenewalRepo } from "./types"

export function createRenewalRepo(db: Db): RenewalRepo {
  return {
    async latestChargeAfter(patientId, after) {
      // Cobrança de renovação (§4): a mais recente do paciente criada depois do plano. O `id` desempata
      // cobranças do mesmo instante, para o resultado não variar entre execuções.
      const [row] = await db
        .select({
          id: payments.id,
          status: payments.status,
          dueDate: payments.dueDate,
          paymentUrl: payments.paymentUrl,
          paidAt: payments.paidAt,
        })
        .from(payments)
        .where(and(eq(payments.patientId, patientId), gt(payments.createdAt, after)))
        .orderBy(desc(payments.createdAt), desc(payments.id))
        .limit(1)
      return row ?? null
    },

    async latestAnswers(patientId) {
      const [row] = await db
        .select({ answers: quizResponses.answers })
        .from(quizResponses)
        .where(eq(quizResponses.patientId, patientId))
        .orderBy(desc(quizResponses.createdAt), desc(quizResponses.id))
        .limit(1)
      if (!row) return null
      return row.answers as Record<string, unknown>
    },
  }
}
