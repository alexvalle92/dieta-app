import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/server/db'
import { recipes } from '@/shared/schema'
import { requireAuth } from '@/lib/auth'
import { eq } from 'drizzle-orm'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth('patient')
    
    if (!session) {
      return NextResponse.json(
        { error: 'Acesso não autorizado' },
        { status: 401 }
      )
    }

    const { id } = await context.params

    const [recipe] = await db
      .select()
      .from(recipes)
      .where(eq(recipes.id, id))
      .limit(1)

    if (!recipe) {
      return NextResponse.json(
        { error: 'Receita não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({ recipe })
  } catch (error) {
    console.error('Recipe fetch error:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar receita' },
      { status: 500 }
    )
  }
}
