import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/guards'
import { getContainer } from '@/lib/container'
import { readInput } from '@/lib/http/read-input'
import { parseRecipeBody } from '@/lib/validation/recipe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const RECIPE_BODY_MAX_BYTES = 256 * 1024

type Params = { params: Promise<{ id: string }> }

const notFound = () => NextResponse.json({ error: 'Receita não encontrada' }, { status: 404 })

export async function GET(_request: NextRequest, { params }: Params) {
  const c = getContainer()
  try {
    const guard = await requireAdmin()
    if (!guard.ok) return guard.response

    const { id } = await params
    const recipe = await c.repos.recipes.get(id)
    if (!recipe) return notFound()

    return NextResponse.json({ recipe })
  } catch (error) {
    c.log.error('admin.recipes.get_error', { message: error instanceof Error ? error.name : 'unknown' })
    return NextResponse.json({ error: 'Erro ao buscar receita' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  const c = getContainer()
  try {
    const guard = await requireAdmin()
    if (!guard.ok) return guard.response

    const { id } = await params
    const parsed = parseRecipeBody(await readInput(request, RECIPE_BODY_MAX_BYTES))
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

    const recipe = await c.repos.recipes.update(id, parsed.value, new Date())
    if (!recipe) return notFound()

    return NextResponse.json({ recipe })
  } catch (error) {
    c.log.error('admin.recipes.update_error', { message: error instanceof Error ? error.name : 'unknown' })
    return NextResponse.json({ error: 'Erro ao atualizar receita' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const c = getContainer()
  try {
    const guard = await requireAdmin()
    if (!guard.ok) return guard.response

    const { id } = await params
    await c.repos.recipes.delete(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    c.log.error('admin.recipes.delete_error', { message: error instanceof Error ? error.name : 'unknown' })
    return NextResponse.json({ error: 'Erro ao deletar receita' }, { status: 500 })
  }
}
