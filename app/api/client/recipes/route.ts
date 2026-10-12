import { NextRequest, NextResponse } from 'next/server'
import { requirePatient } from '@/lib/auth/guards'
import { getContainer } from '@/lib/container'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Receitas liberadas para o cliente (`active_customer`), com busca por título e categoria. */
export async function GET(request: NextRequest) {
  const c = getContainer()
  try {
    const guard = await requirePatient()
    if (!guard.ok) return guard.response

    const search = new URL(request.url).searchParams.get('search')?.trim() || ''
    const recipes = await c.repos.recipes.list({ onlyActive: true, search })
    return NextResponse.json({ recipes })
  } catch (error) {
    c.log.error('client.recipes.list_error', { message: error instanceof Error ? error.name : 'unknown' })
    return NextResponse.json({ error: 'Erro ao buscar receitas' }, { status: 500 })
  }
}
