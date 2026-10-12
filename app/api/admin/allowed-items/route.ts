import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/guards'
import { getContainer } from '@/lib/container'
import { readInput } from '@/lib/http/read-input'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_FOOD_NAME_LENGTH = 200

export async function GET() {
  const c = getContainer()
  try {
    const guard = await requireAdmin()
    if (!guard.ok) return guard.response

    const items = await c.repos.mealConfig.listAllowedItems()
    return NextResponse.json({ items })
  } catch (error) {
    c.log.error('admin.allowed_items.list_error', { message: error instanceof Error ? error.name : 'unknown' })
    return NextResponse.json({ error: 'Erro ao buscar itens permitidos' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const c = getContainer()
  try {
    const guard = await requireAdmin()
    if (!guard.ok) return guard.response

    const { mealCategoryId, itemType, foodName, recipeId } = await readInput(request)
    if (typeof mealCategoryId !== 'string' || mealCategoryId === '' || typeof itemType !== 'string' || itemType === '') {
      return NextResponse.json({ error: 'Tipo de refeição e tipo de item são obrigatórios' }, { status: 400 })
    }
    if (itemType !== 'food' && itemType !== 'recipe') {
      return NextResponse.json({ error: "Tipo de item deve ser 'food' ou 'recipe'" }, { status: 400 })
    }

    let food: string | null = null
    let recipe: string | null = null
    if (itemType === 'food') {
      if (typeof foodName !== 'string' || foodName.trim() === '' || foodName.trim().length > MAX_FOOD_NAME_LENGTH) {
        return NextResponse.json({ error: 'Informe o nome do alimento (até 200 caracteres)' }, { status: 400 })
      }
      food = foodName.trim()
    } else {
      if (typeof recipeId !== 'string' || recipeId === '') {
        return NextResponse.json({ error: 'Selecione a receita' }, { status: 400 })
      }
      recipe = recipeId
    }

    const item = await c.repos.mealConfig.createAllowedItem(
      { mealCategoryId, itemType, foodName: food, recipeId: recipe },
      new Date(),
    )
    return NextResponse.json({ success: true, item })
  } catch (error) {
    c.log.error('admin.allowed_items.create_error', { message: error instanceof Error ? error.name : 'unknown' })
    return NextResponse.json({ error: 'Erro ao salvar item permitido' }, { status: 500 })
  }
}
