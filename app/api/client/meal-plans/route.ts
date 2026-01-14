import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/server/db'
import { mealPlans } from '@/shared/schema'
import { requireAuth } from '@/lib/auth'
import { eq, desc } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth('patient')
    
    if (!session) {
      return NextResponse.json(
        { error: 'Acesso não autorizado' },
        { status: 401 }
      )
    }

    const mealPlansList = await db
      .select()
      .from(mealPlans)
      .where(eq(mealPlans.patientId, session.userId))
      .orderBy(desc(mealPlans.createdAt))

    return NextResponse.json({ mealPlans: mealPlansList })
  } catch (error) {
    console.error('Meal plans fetch error:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar planos alimentares' },
      { status: 500 }
    )
  }
}
