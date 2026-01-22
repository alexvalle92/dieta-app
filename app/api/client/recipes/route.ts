import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/server/db'
import { recipes } from '@/shared/schema'
import { requireAuth } from '@/lib/auth'
import { desc, ilike, or, and, eq } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth('patient')
    
    if (!session) {
      return NextResponse.json(
        { error: 'Acesso não autorizado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim().toLowerCase() || ''

    let recipesList;
    
    const baseCondition = eq(recipes.activeCustomer, true);

    if (search) {
      recipesList = await db
        .select()
        .from(recipes)
        .where(
          and(
            baseCondition,
            or(
              ilike(recipes.title, `%${search}%`),
              ilike(recipes.category, `%${search}%`)
            )
          )
        )
        .orderBy(desc(recipes.createdAt))
    } else {
      recipesList = await db
        .select()
        .from(recipes)
        .where(baseCondition)
        .orderBy(desc(recipes.createdAt))
    }

    return NextResponse.json({ recipes: recipesList })
  } catch (error) {
    console.error('Recipes fetch error:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar receitas' },
      { status: 500 }
    )
  }
}
