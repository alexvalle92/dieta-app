import { NextRequest, NextResponse } from 'next/server'
import { requirePatient } from '@/lib/auth/guards'
import { getContainer } from '@/lib/container'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const c = getContainer()
  try {
    const guard = await requirePatient()
    if (!guard.ok) return guard.response

    const { id } = await params
    const recipe = await c.repos.recipes.get(id)
    if (!recipe) {
      return NextResponse.json({ error: 'Receita não encontrada' }, { status: 404 })
    }

    return NextResponse.json({ recipe })
  } catch (error) {
    c.log.error('client.recipes.get_error', { message: error instanceof Error ? error.name : 'unknown' })
    return NextResponse.json({ error: 'Erro ao buscar receita' }, { status: 500 })
  }
}
