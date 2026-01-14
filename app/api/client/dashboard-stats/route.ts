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
          status: mealPlans.status,
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

    return NextResponse.json({
      stats: {
        planosAtivos: activePlans.length,
        totalPlanos: allPlans.length,
        ultimaAtualizacao: lastUpdate,
        receitasDisponiveis: Number(recipesCount[0]?.count) || 0
      },
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
