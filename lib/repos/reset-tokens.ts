import { randomUUID } from "node:crypto"
import { and, eq } from "drizzle-orm"
import type { Db } from "@/lib/db/client"
import { notifications, passwordResetTokens, patients } from "@/lib/db/schema"
import type { ResetTokenRepo } from "./types"

export function createResetTokenRepo(db: Db): ResetTokenRepo {
  return {
    async createRequest(d) {
      const notificationIds = d.recipients.map(() => randomUUID())

      await db.transaction(async (tx) => {
        await tx.insert(passwordResetTokens).values({
          id: randomUUID(),
          patientId: d.patientId,
          tokenHash: d.tokenHash,
          expiresAt: d.expiresAt,
          used: false,
          createdAt: d.now,
          updatedAt: d.now,
        })

        if (d.recipients.length > 0) {
          await tx.insert(notifications).values(
            d.recipients.map((r, i) => ({
              id: notificationIds[i],
              patientId: d.patientId,
              quizResponseId: null,
              paymentId: null,
              channel: r.channel,
              kind: "password_reset",
              recipient: r.recipient,
              status: "pending" as const,
              partsSent: 0,
              attempts: 0,
              nextAttemptAt: d.now,
              payload: { link: d.link },
              createdAt: d.now,
              updatedAt: d.now,
            })),
          )
        }
      })

      return { notificationIds }
    },

    async redeem(d) {
      return db.transaction(async (tx) => {
        const [token] = await tx
          .select({
            id: passwordResetTokens.id,
            patientId: passwordResetTokens.patientId,
            expiresAt: passwordResetTokens.expiresAt,
            used: passwordResetTokens.used,
          })
          .from(passwordResetTokens)
          .where(eq(passwordResetTokens.tokenHash, d.tokenHash))
          .for("update")

        if (!token || token.used) return "invalid" as const
        if (token.expiresAt.getTime() <= d.now.getTime()) return "expired" as const

        await tx
          .update(patients)
          .set({
            passwordHash: d.passwordHash,
            mustChangePassword: false,
            passwordSetAt: d.now,
            updatedAt: d.now,
          })
          .where(eq(patients.id, token.patientId))

        // Todos os links pedidos antes deixam de valer.
        await tx
          .update(passwordResetTokens)
          .set({ used: true, updatedAt: d.now })
          .where(and(eq(passwordResetTokens.patientId, token.patientId), eq(passwordResetTokens.used, false)))

        return "ok" as const
      })
    },
  }
}
