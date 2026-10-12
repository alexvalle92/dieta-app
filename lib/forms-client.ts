import type { Logger } from "@/lib/log"

const DEFAULT_TIMEOUT_MS = 5000
/** A renovação espera a resposta do v0-tami-forms (que pode criar a cobrança no Asaas): 25 s. */
const DEFAULT_RENEWAL_TIMEOUT_MS = 25_000

export type SubmitRenewalResult = { ok: true; paymentUrl: string | null } | { ok: false }

export type FormsClient = {
  dispatchNotifications(ids: string[]): Promise<boolean>
  submitRenewal(body: { submissionId: string; answers: Record<string, unknown> }): Promise<SubmitRenewalResult>
}

/**
 * Cliente do v0-tami-forms (o dono do envio de e-mail e WhatsApp e da cobrança). O PlanA pede o envio
 * imediato de mensagens que já gravou em `notifications`; se o pedido falhar, o job de 2 minutos
 * do v0-tami-forms envia. Também envia o formulário de renovação (`POST /api/renewals`). Nunca lança
 * e nunca registra o token, o endereço nem o corpo (dados pessoais).
 */
export function createFormsClient(d: {
  baseUrl: string
  token: string
  fetchImpl?: typeof fetch
  timeoutMs?: number
  renewalTimeoutMs?: number
  log: Logger
}): FormsClient {
  const fetchImpl = d.fetchImpl ?? fetch
  const base = d.baseUrl.replace(/\/+$/, "")
  const dispatchUrl = `${base}/api/notifications/dispatch`
  const renewalsUrl = `${base}/api/renewals`

  return {
    async dispatchNotifications(ids) {
      if (ids.length === 0) return true

      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), d.timeoutMs ?? DEFAULT_TIMEOUT_MS)
      try {
        const response = await fetchImpl(dispatchUrl, {
          method: "POST",
          headers: { authorization: `Bearer ${d.token}`, "content-type": "application/json" },
          body: JSON.stringify({ notificationIds: ids }),
          signal: controller.signal,
        })
        if (response.ok) return true
        d.log.warn("forms.dispatch.failed", { status: response.status })
        return false
      } catch (err) {
        d.log.warn("forms.dispatch.failed", { error: err instanceof Error ? err.name : "unknown" })
        return false
      } finally {
        clearTimeout(timer)
      }
    },

    async submitRenewal(body) {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), d.renewalTimeoutMs ?? DEFAULT_RENEWAL_TIMEOUT_MS)
      try {
        const response = await fetchImpl(renewalsUrl, {
          method: "POST",
          headers: { authorization: `Bearer ${d.token}`, "content-type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        })
        if (!response.ok) {
          d.log.warn("forms.renewal.failed", { status: response.status })
          return { ok: false }
        }
        // O corpo é lido dentro do mesmo prazo: o `finally` só solta o timer depois.
        const payload: unknown = await response.json()
        const parsed = payload as { ok?: unknown; paymentUrl?: unknown } | null
        if (parsed?.ok !== true) {
          d.log.warn("forms.renewal.failed", { status: response.status, reason: "unexpected_body" })
          return { ok: false }
        }
        const url = parsed.paymentUrl
        return { ok: true, paymentUrl: typeof url === "string" && url !== "" ? url : null }
      } catch (err) {
        d.log.warn("forms.renewal.failed", { error: err instanceof Error ? err.name : "unknown" })
        return { ok: false }
      } finally {
        clearTimeout(timer)
      }
    },
  }
}
