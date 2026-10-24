import { requireAdmin } from "@/lib/auth/guards"
import { getContainer } from "@/lib/container"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const c = getContainer()
  try {
    const guard = await requireAdmin()
    if (!guard.ok) return guard.response

    const items = await c.repos.failures.listFailed()
    return Response.json({ items })
  } catch (error) {
    c.log.error("admin.failures.error", { message: error instanceof Error ? error.name : "unknown" })
    return Response.json({ error: "Erro ao carregar as falhas" }, { status: 500 })
  }
}
