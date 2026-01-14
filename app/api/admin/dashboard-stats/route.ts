import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { db } from '@/server/db'
import { patients, mealPlans, recipes } from '@/shared/schema'
import { eq, gte, lte, and, sql } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth('admin')
    
    if (!session) {
      return NextResponse.json(
        { error: 'Acesso não autorizado' },
        { status: 401 }
      )
    }

    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

    const [
      patientsCount,
      activePlansList,
      recipesCount,
      newPatientsThisMonth,
      newPatientsLastMonth
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(patients),
      db.select({ id: mealPlans.id }).from(mealPlans).where(eq(mealPlans.status, 'active')),
      db.select({ count: sql<number>`count(*)` }).from(recipes),
      db.select({ count: sql<number>`count(*)` }).from(patients).where(gte(patients.createdAt, firstDayOfMonth)),
      db.select({ count: sql<number>`count(*)` }).from(patients).where(
        and(
          gte(patients.createdAt, firstDayOfLastMonth),
          lte(patients.createdAt, lastDayOfLastMonth)
        )
      )
    ])

    const totalPatients = Number(patientsCount[0]?.count) || 0
    const activePlans = activePlansList.length
    const totalRecipes = Number(recipesCount[0]?.count) || 0
    const newThisMonth = Number(newPatientsThisMonth[0]?.count) || 0
    const newLastMonth = Number(newPatientsLastMonth[0]?.count) || 0

    let growthPercentage = 0
    if (newLastMonth > 0) {
      growthPercentage = Math.round(
        ((newThisMonth - newLastMonth) / newLastMonth) * 100
      )
    } else if (newThisMonth > 0) {
      growthPercentage = 100
    }

    return NextResponse.json({
      stats: {
        totalPacientes: totalPatients,
        planosAtivos: activePlans,
        receitasCadastradas: totalRecipes,
        novosEsseMes: newThisMonth,
        crescimento: growthPercentage
      }
    })
  } catch (error) {
    console.error('Admin dashboard stats error:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar estatísticas' },
      { status: 500 }
    )
  }
}
