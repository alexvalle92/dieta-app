import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/server/db'
import { recipes } from '@/shared/schema'
import { desc } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth('admin')
    
    if (!session) {
      return NextResponse.json(
        { error: 'Acesso não autorizado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim().toLowerCase() || ''

    const recipesList = await db
      .select()
      .from(recipes)
      .orderBy(desc(recipes.createdAt))

    let filteredRecipes = recipesList

    if (search) {
      filteredRecipes = recipesList.filter((recipe) => {
        const titleMatch = recipe.title?.toLowerCase().includes(search)
        const categoryMatch = recipe.category?.toLowerCase().includes(search)
        return titleMatch || categoryMatch
      })
    }

    return NextResponse.json({ recipes: filteredRecipes })
  } catch (error) {
    console.error('Recipes fetch error:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar receitas' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth('admin')
    
    if (!session) {
      return NextResponse.json(
        { error: 'Acesso não autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { title, description, ingredients, preparation, prep_time, servings, calories, category, image_url } = body

    if (!title || !ingredients || !preparation) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: title, ingredients, preparation' },
        { status: 400 }
      )
    }

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json(
        { error: 'Ingredientes deve ser um array não vazio' },
        { status: 400 }
      )
    }

    const [recipe] = await db
      .insert(recipes)
      .values({
        title,
        description: description || null,
        ingredients,
        preparation,
        prepTime: prep_time || null,
        servings: servings || null,
        calories: calories || null,
        category: category || null,
        imageUrl: image_url || null,
      })
      .returning()

    return NextResponse.json({ recipe }, { status: 201 })
  } catch (error) {
    console.error('Recipe creation error:', error)
    return NextResponse.json(
      { error: 'Erro ao criar receita' },
      { status: 500 }
    )
  }
}
