import type { Logger } from "@/lib/log"

const DEFAULT_TIMEOUT_MS = 5000

/**
 * Cliente do v0-tami-forms (o dono do envio de e-mail e WhatsApp). O PlanA só pede o envio
 * imediato de mensagens que já gravou em `notifications`; se o pedido falhar, o job de 2 minutos
 * do v0-tami-forms envia. Nunca lança e nunca registra o token nem o endereço.
 */
export function createFormsClient(d: {
  baseUrl: string
  token: string
  fetchImpl?: typeof fetch
  timeoutMs?: number
  log: Logger
}): { dispatchNotifications(ids: string[]): Promise<boolean> } {
  const fetchImpl = d.fetchImpl ?? fetch
  const url = `${d.baseUrl.replace(/\/+$/, "")}/api/notifications/dispatch`

  return {
    async dispatchNotifications(ids) {
      if (ids.length === 0) return true

      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), d.timeoutMs ?? DEFAULT_TIMEOUT_MS)
      try {
        const response = await fetchImpl(url, {
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
  }
}
