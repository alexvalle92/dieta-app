import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { db } from '@/server/db'
import { mealPlans, recipes } from '@/shared/schema'
import { eq, desc, sql } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth('patient')
    
    if (!session) {
      return NextResponse.json(
        { error: 'Acesso não autorizado' },
        { status: 401 }
      )
    }

    const patientId = session.userId

    const [allPlans, recipesCount] = await Promise.all([
      db
        .select({
          id: mealPlans.id,
          title: mealPlans.title,
          status: mealPlans.status,
          startDate: mealPlans.startDate,
          endDate: mealPlans.endDate,
          dueDateNewMealPlan: mealPlans.dueDateNewMealPlan,
          paymentUrlNewMealPlan: mealPlans.paymentUrlNewMealPlan,
          createdAt: mealPlans.createdAt
        })
        .from(mealPlans)
        .where(eq(mealPlans.patientId, patientId))
        .orderBy(desc(mealPlans.createdAt)),
      db
        .select({ count: sql<number>`count(*)` })
        .from(recipes)
    ])

    const activePlans = allPlans.filter(plan => plan.status === 'active')
    const recentPlans = allPlans.slice(0, 3)

    const lastUpdate = allPlans.length > 0 && allPlans[0].createdAt
      ? new Date(allPlans[0].createdAt).toLocaleDateString('pt-BR')
      : 'Nenhum'

    const activePlan = activePlans.length > 0 ? activePlans[0] : null

    return NextResponse.json({
      stats: {
        planosAtivos: activePlans.length,
        totalPlanos: allPlans.length,
        ultimaAtualizacao: lastUpdate,
        receitasDisponiveis: Number(recipesCount[0]?.count) || 0
      },
      activePlan: activePlan ? {
        id: activePlan.id,
        title: activePlan.title,
        status: activePlan.status,
        startDate: activePlan.startDate,
        endDate: activePlan.endDate,
        dueDateNewMealPlan: activePlan.dueDateNewMealPlan,
        paymentUrlNewMealPlan: activePlan.paymentUrlNewMealPlan
      } : null,
      allPlans: allPlans.map((plan) => ({
        id: plan.id,
        endDate: plan.endDate,
        dueDateNewMealPlan: plan.dueDateNewMealPlan,
        paymentUrlNewMealPlan: plan.paymentUrlNewMealPlan,
        status: plan.status
      })),
      recentPlans: recentPlans.map((plan) => ({
        id: plan.id,
        status: plan.status,
        created_at: plan.createdAt
      }))
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar estatísticas' },
      { status: 500 }
    )
  }
}
