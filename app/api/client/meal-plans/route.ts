import { NextResponse } from 'next/server'
import { requirePatient } from '@/lib/auth/guards'
import { getContainer } from '@/lib/container'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const c = getContainer()
  try {
    const guard = await requirePatient()
    if (!guard.ok) return guard.response

    const mealPlans = await c.renewal.decorate(await c.repos.mealPlans.listByPatient(guard.session.userId))
    return NextResponse.json({ mealPlans })
  } catch (error) {
    c.log.error('client.meal_plans.list_error', { message: error instanceof Error ? error.name : 'unknown' })
    return NextResponse.json({ error: 'Erro ao buscar planos alimentares' }, { status: 500 })
  }
}
