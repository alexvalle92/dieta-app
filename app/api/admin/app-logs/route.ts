import { requireAdmin } from "@/lib/auth/guards"
import { getContainer } from "@/lib/container"
import { APP_LOGS_PAGE_SIZE } from "@/lib/repos/failures"
import { parseAppLogsQuery } from "@/lib/validation/failures"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const c = getContainer()
  try {
    const guard = await requireAdmin()
    if (!guard.ok) return guard.response

    const query = parseAppLogsQuery(new URL(request.url).searchParams, new Date())
    if (!query.ok) return Response.json({ error: "Filtro inválido" }, { status: 400 })

    const page = await c.repos.failures.listAppLogs(query.filter)
    return Response.json({ ...page, page: query.filter.page, pageSize: APP_LOGS_PAGE_SIZE })
  } catch (error) {
    c.log.error("admin.app_logs.error", { message: error instanceof Error ? error.name : "unknown" })
    return Response.json({ error: "Erro ao carregar os logs" }, { status: 500 })
  }
}
