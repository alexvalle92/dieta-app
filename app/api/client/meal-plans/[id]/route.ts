import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/server/db'
import { mealPlans } from '@/shared/schema'
import { requireAuth } from '@/lib/auth'
import { eq, and } from 'drizzle-orm'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth('patient')
    
    if (!session) {
      return NextResponse.json(
        { error: 'Acesso não autorizado' },
        { status: 401 }
      )
    }

    const { id } = await params

    const [mealPlan] = await db
      .select()
      .from(mealPlans)
      .where(
        and(
          eq(mealPlans.id, id),
          eq(mealPlans.patientId, session.userId)
        )
      )
      .limit(1)

    if (!mealPlan) {
      return NextResponse.json(
        { error: 'Plano alimentar não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({ mealPlan })
  } catch (error) {
    console.error('Meal plan fetch error:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar plano alimentar' },
      { status: 500 }
    )
  }
}
