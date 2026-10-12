import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/guards'
import { getContainer } from '@/lib/container'
import { readInput } from '@/lib/http/read-input'
import { parseRecipeBody } from '@/lib/validation/recipe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Receitas trazem listas de ingredientes e modo de preparo: aceitam corpos maiores que os de login. */
const RECIPE_BODY_MAX_BYTES = 256 * 1024

export async function GET(request: NextRequest) {
  const c = getContainer()
  try {
    const guard = await requireAdmin()
    if (!guard.ok) return guard.response

    const search = new URL(request.url).searchParams.get('search')?.trim() || ''
    const recipes = await c.repos.recipes.list({ onlyActive: false, search })
    return NextResponse.json({ recipes })
  } catch (error) {
    c.log.error('admin.recipes.list_error', { message: error instanceof Error ? error.name : 'unknown' })
    return NextResponse.json({ error: 'Erro ao buscar receitas' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const c = getContainer()
  try {
    const guard = await requireAdmin()
    if (!guard.ok) return guard.response

    const parsed = parseRecipeBody(await readInput(request, RECIPE_BODY_MAX_BYTES))
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

    const recipe = await c.repos.recipes.create(parsed.value, new Date())
    return NextResponse.json({ recipe }, { status: 201 })
  } catch (error) {
    c.log.error('admin.recipes.create_error', { message: error instanceof Error ? error.name : 'unknown' })
    return NextResponse.json({ error: 'Erro ao criar receita' }, { status: 500 })
  }
}
