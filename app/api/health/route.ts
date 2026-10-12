import { getContainer } from "@/lib/container"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** GET /api/health: `SELECT 1` no MySQL → 200 `{ ok: true }`, senão 503 `{ ok: false }` (sem detalhes). */
export async function GET(): Promise<Response> {
  try {
    // Montar o container dentro do try: env ou banco indisponível → 503, não 500.
    await getContainer().ping()
    return Response.json({ ok: true })
  } catch {
    return Response.json({ ok: false }, { status: 503 })
  }
}
