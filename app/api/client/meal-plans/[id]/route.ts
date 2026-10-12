import { NextRequest, NextResponse } from 'next/server'
import { requirePatient } from '@/lib/auth/guards'
import { getContainer } from '@/lib/container'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const c = getContainer()
  try {
    const guard = await requirePatient()
    if (!guard.ok) return guard.response

    const { id } = await params
    const mealPlan = await c.repos.mealPlans.getForPatient(id, guard.session.userId)
    if (!mealPlan) {
      return NextResponse.json({ error: 'Plano alimentar não encontrado' }, { status: 404 })
    }

    // Só o plano ativo abre; os concluídos e cancelados aparecem na lista, mas não no detalhe.
    if ((mealPlan.status || '').trim().toLowerCase() !== 'active') {
      return NextResponse.json({ error: 'Este plano alimentar não está mais ativo' }, { status: 403 })
    }

    const [decorated] = await c.renewal.decorate([mealPlan])
    return NextResponse.json({ mealPlan: decorated })
  } catch (error) {
    c.log.error('client.meal_plans.get_error', { message: error instanceof Error ? error.name : 'unknown' })
    return NextResponse.json({ error: 'Erro ao buscar plano alimentar' }, { status: 500 })
  }
}
