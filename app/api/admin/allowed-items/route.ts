import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/server/db'
import { allowedMealItems, mealCategories, recipes } from '@/shared/schema'
import { eq, asc, desc } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  try {
    const session = await requireAuth('admin')
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const items = await db.select({
      id: allowedMealItems.id,
      itemType: allowedMealItems.itemType,
      foodName: allowedMealItems.foodName,
      createdAt: allowedMealItems.createdAt,
      category: {
        id: mealCategories.id,
        name: mealCategories.name
      },
      recipe: {
        id: recipes.id,
        title: recipes.title
      }
    })
    .from(allowedMealItems)
    .innerJoin(mealCategories, eq(allowedMealItems.mealCategoryId, mealCategories.id))
    .leftJoin(recipes, eq(allowedMealItems.recipeId, recipes.id))
    .orderBy(desc(allowedMealItems.createdAt))

    return NextResponse.json({ items })
  } catch (error) {
    console.error('Fetch allowed items error:', error)
    return NextResponse.json({ error: 'Erro ao buscar itens permitidos' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth('admin')
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { mealCategoryId, itemType, foodName, recipeId } = await request.json()
    
    if (!mealCategoryId || !itemType) {
      return NextResponse.json({ error: 'Tipo de refeição e tipo de item são obrigatórios' }, { status: 400 })
    }

    const [item] = await db.insert(allowedMealItems).values({
      mealCategoryId,
      itemType,
      foodName: itemType === 'food' ? foodName : null,
      recipeId: itemType === 'recipe' ? recipeId : null
    }).returning()

    return NextResponse.json({ success: true, item })
  } catch (error) {
    console.error('Create allowed item error:', error)
    return NextResponse.json({ error: 'Erro ao salvar item permitido' }, { status: 500 })
  }
}
