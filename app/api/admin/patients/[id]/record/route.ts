import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/guards'
import { getContainer } from '@/lib/container'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Cadastro completo do paciente (somente leitura): dados, respostas do quiz, cobranças, planos e mensagens. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const c = getContainer()
  try {
    const guard = await requireAdmin()
    if (!guard.ok) return guard.response

    const { id } = await params
    const record = await c.repos.patientRecord.get(id)
    if (!record) return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })

    return NextResponse.json({ record })
  } catch (error) {
    c.log.error('admin.patient_record.error', { message: error instanceof Error ? error.name : 'unknown' })
    return NextResponse.json({ error: 'Erro ao processar requisição' }, { status: 500 })
  }
}
