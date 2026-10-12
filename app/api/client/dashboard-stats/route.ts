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

    const [allPlans, recipesCount] = await Promise.all([
      c.repos.mealPlans.listByPatient(guard.session.userId),
      c.repos.stats.recipesCount(),
    ])

    const activePlans = allPlans.filter((plan) => plan.status === 'active')
    const activePlan = activePlans.length > 0 ? activePlans[0] : null
    const recentPlans = allPlans.slice(0, 3)

    const lastUpdate =
      allPlans.length > 0 && allPlans[0].createdAt
        ? new Date(allPlans[0].createdAt).toLocaleDateString('pt-BR')
        : 'Nenhum'

    return NextResponse.json({
      stats: {
        planosAtivos: activePlans.length,
        totalPlanos: allPlans.length,
        ultimaAtualizacao: lastUpdate,
        receitasDisponiveis: recipesCount,
      },
      activePlan: activePlan
        ? {
            id: activePlan.id,
            title: activePlan.title,
            status: activePlan.status,
            startDate: activePlan.startDate,
            endDate: activePlan.endDate,
            dueDateNewMealPlan: activePlan.dueDateNewMealPlan,
            paymentUrlNewMealPlan: activePlan.paymentUrlNewMealPlan,
          }
        : null,
      allPlans: allPlans.map((plan) => ({
        id: plan.id,
        endDate: plan.endDate,
        dueDateNewMealPlan: plan.dueDateNewMealPlan,
        paymentUrlNewMealPlan: plan.paymentUrlNewMealPlan,
        status: plan.status,
      })),
      recentPlans: recentPlans.map((plan) => ({
        id: plan.id,
        status: plan.status,
        created_at: plan.createdAt,
      })),
    })
  } catch (error) {
    c.log.error('client.dashboard_stats.error', { message: error instanceof Error ? error.name : 'unknown' })
    return NextResponse.json({ error: 'Erro ao buscar estatísticas' }, { status: 500 })
  }
}
