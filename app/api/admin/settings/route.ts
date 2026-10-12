import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/guards'
import { getContainer } from '@/lib/container'
import { readInput } from '@/lib/http/read-input'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** A definição técnica da dieta é um texto longo (TEXT = 64 KB). */
const SETTINGS_BODY_MAX_BYTES = 128 * 1024
const MAX_DEFINITION_CHARS = 20_000

export async function GET() {
  const c = getContainer()
  try {
    const guard = await requireAdmin()
    if (!guard.ok) return guard.response

    const dietTechnicalDefinition = await c.repos.mealConfig.getDietDefinition()
    return NextResponse.json({ settings: { dietTechnicalDefinition } })
  } catch (error) {
    c.log.error('admin.settings.get_error', { message: error instanceof Error ? error.name : 'unknown' })
    return NextResponse.json({ error: 'Erro ao buscar configurações' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const c = getContainer()
  try {
    const guard = await requireAdmin()
    if (!guard.ok) return guard.response

    const { dietTechnicalDefinition } = await readInput(request, SETTINGS_BODY_MAX_BYTES)
    if (typeof dietTechnicalDefinition !== 'string') {
      return NextResponse.json({ error: 'dietTechnicalDefinition deve ser texto' }, { status: 400 })
    }
    if (dietTechnicalDefinition.length > MAX_DEFINITION_CHARS) {
      return NextResponse.json({ error: 'O texto deve ter até 20.000 caracteres' }, { status: 400 })
    }

    await c.repos.mealConfig.setDietDefinition(dietTechnicalDefinition, new Date())
    return NextResponse.json({ success: true })
  } catch (error) {
    c.log.error('admin.settings.save_error', { message: error instanceof Error ? error.name : 'unknown' })
    return NextResponse.json({ error: 'Erro ao salvar configurações' }, { status: 500 })
  }
}
