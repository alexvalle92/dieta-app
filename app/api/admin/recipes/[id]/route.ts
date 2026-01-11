import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/server/db'
import { recipes } from '@/shared/schema'
import { eq } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth('admin')
    
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

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth('admin')
    
    if (!session) {
      return NextResponse.json(
        { error: 'Acesso não autorizado' },
        { status: 401 }
      )
    }

    const { id } = await context.params
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
      .update(recipes)
      .set({
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
      .where(eq(recipes.id, id))
      .returning()

    if (!recipe) {
      return NextResponse.json(
        { error: 'Receita não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({ recipe })
  } catch (error) {
    console.error('Recipe update error:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar receita' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth('admin')
    
    if (!session) {
      return NextResponse.json(
        { error: 'Acesso não autorizado' },
        { status: 401 }
      )
    }

    const { id } = await context.params

    await db
      .delete(recipes)
      .where(eq(recipes.id, id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Recipe deletion error:', error)
    return NextResponse.json(
      { error: 'Erro ao deletar receita' },
      { status: 500 }
    )
  }
}
