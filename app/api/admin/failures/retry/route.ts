import { requireAdmin } from "@/lib/auth/guards"
import { getContainer } from "@/lib/container"
import { readJsonBody } from "@/lib/http/read-json"
import { retryRequestSchema, toRetryTarget } from "@/lib/validation/failures"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** O mesmo teto do `/api/jobs/retry` do v0-tami-forms. */
const RETRY_MAX_BODY_BYTES = 4 * 1024

export async function POST(request: Request) {
  const c = getContainer()
  try {
    const guard = await requireAdmin()
    if (!guard.ok) return guard.response

    const body = await readJsonBody(request, RETRY_MAX_BODY_BYTES)
    if (!body.ok) return Response.json({ error: "Pedido inválido" }, { status: body.status })
    const parsed = retryRequestSchema.safeParse(body.value)
    if (!parsed.success) return Response.json({ error: "Pedido inválido" }, { status: 400 })

    const result = await c.forms.retry(toRetryTarget(parsed.data))
    if (!result.ok) return Response.json({ error: "Não foi possível reexecutar agora" }, { status: 502 })

    // O id do item não vai para o log.
    c.log.info("admin.failures.retry", {
      type: parsed.data.type,
      reopened: result.reopened,
      adminId: guard.session.userId,
    })
    return Response.json({ ok: true, reopened: result.reopened })
  } catch (error) {
    c.log.error("admin.failures.retry.error", { message: error instanceof Error ? error.name : "unknown" })
    return Response.json({ error: "Erro ao reexecutar" }, { status: 500 })
  }
}
