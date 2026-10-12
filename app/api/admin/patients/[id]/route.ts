import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/guards'
import { getContainer } from '@/lib/container'
import { readInput } from '@/lib/http/read-input'
import { publicPatient } from '@/lib/http/public-patient'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

const notFound = () => NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })

export async function GET(_request: NextRequest, { params }: Params) {
  const c = getContainer()
  try {
    const guard = await requireAdmin()
    if (!guard.ok) return guard.response

    const { id } = await params
    const patient = await c.repos.patients.getById(id)
    if (!patient) return notFound()

    return NextResponse.json({ patient: publicPatient(patient) })
  } catch (error) {
    c.log.error('admin.patients.get_error', { message: error instanceof Error ? error.name : 'unknown' })
    return NextResponse.json({ error: 'Erro ao processar requisição' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  const c = getContainer()
  try {
    const guard = await requireAdmin()
    if (!guard.ok) return guard.response

    const { id } = await params
    const result = await c.patientAdmin.update(id, await readInput(request))

    if (result === 'not_found') return notFound()
    if (result === 'missing_fields') {
      return NextResponse.json({ error: 'Nome e email são obrigatórios' }, { status: 400 })
    }
    if (result === 'invalid_name') {
      return NextResponse.json({ error: 'O nome deve ter até 200 caracteres' }, { status: 400 })
    }
    if (result === 'invalid_email') {
      return NextResponse.json({ error: 'E-mail inválido' }, { status: 400 })
    }
    if (result === 'invalid_phone') {
      return NextResponse.json({ error: 'Telefone inválido. Informe o DDD e o número' }, { status: 400 })
    }

    return NextResponse.json({ success: true, patient: publicPatient(result) })
  } catch (error) {
    c.log.error('admin.patients.update_error', { message: error instanceof Error ? error.name : 'unknown' })
    return NextResponse.json({ error: 'Erro ao processar requisição' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const c = getContainer()
  try {
    const guard = await requireAdmin()
    if (!guard.ok) return guard.response

    const { id } = await params
    const result = await c.patientAdmin.remove(id)

    if (result === 'not_found') return notFound()
    if (result === 'has_history') {
      return NextResponse.json({ error: 'Paciente com pagamentos não pode ser excluído' }, { status: 409 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    c.log.error('admin.patients.delete_error', { message: error instanceof Error ? error.name : 'unknown' })
    return NextResponse.json({ error: 'Erro ao processar requisição' }, { status: 500 })
  }
}
