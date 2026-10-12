import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/guards'
import { getContainer } from '@/lib/container'
import { readInput } from '@/lib/http/read-input'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_NAME_LENGTH = 100

export async function GET() {
  const c = getContainer()
  try {
    const guard = await requireAdmin()
    if (!guard.ok) return guard.response

    const categories = await c.repos.mealConfig.listCategories()
    return NextResponse.json({ categories })
  } catch (error) {
    c.log.error('admin.meal_categories.list_error', { message: error instanceof Error ? error.name : 'unknown' })
    return NextResponse.json({ error: 'Erro ao buscar categorias de refeição' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const c = getContainer()
  try {
    const guard = await requireAdmin()
    if (!guard.ok) return guard.response

    const { name } = await readInput(request)
    if (typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
    }
    if (name.trim().length > MAX_NAME_LENGTH) {
      return NextResponse.json({ error: 'O nome deve ter até 100 caracteres' }, { status: 400 })
    }

    const category = await c.repos.mealConfig.createCategory(name.trim(), new Date())
    if (category === 'name_taken') {
      return NextResponse.json({ error: 'Categoria já cadastrada' }, { status: 409 })
    }

    return NextResponse.json({ success: true, category })
  } catch (error) {
    c.log.error('admin.meal_categories.create_error', { message: error instanceof Error ? error.name : 'unknown' })
    return NextResponse.json({ error: 'Erro ao salvar categoria de refeição' }, { status: 500 })
  }
}
