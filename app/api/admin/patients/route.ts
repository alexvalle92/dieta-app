import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/guards'
import { getContainer } from '@/lib/container'
import { readInput } from '@/lib/http/read-input'
import { publicPatient } from '@/lib/http/public-patient'
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from '@/lib/validation/password'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const c = getContainer()
  try {
    const guard = await requireAdmin()
    if (!guard.ok) return guard.response

    const search = new URL(request.url).searchParams.get('search') || ''
    const patients = await c.repos.patients.list(search)
    return NextResponse.json({ patients: patients.map(publicPatient) })
  } catch (error) {
    c.log.error('admin.patients.list_error', { message: error instanceof Error ? error.name : 'unknown' })
    return NextResponse.json({ error: 'Erro ao processar requisição' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const c = getContainer()
  try {
    const guard = await requireAdmin()
    if (!guard.ok) return guard.response

    const result = await c.patientAdmin.create(await readInput(request))
    if (!result.ok) {
      switch (result.reason) {
        case 'missing_fields':
          return NextResponse.json({ error: 'Nome, email, CPF e senha são obrigatórios' }, { status: 400 })
        case 'invalid_name':
          return NextResponse.json({ error: 'O nome deve ter até 200 caracteres' }, { status: 400 })
        case 'invalid_cpf':
          return NextResponse.json({ error: 'CPF inválido' }, { status: 400 })
        case 'invalid_email':
          return NextResponse.json({ error: 'E-mail inválido' }, { status: 400 })
        case 'invalid_password':
          return NextResponse.json(
            { error: `A senha deve ter entre ${MIN_PASSWORD_LENGTH} e ${MAX_PASSWORD_LENGTH} caracteres` },
            { status: 400 },
          )
        case 'cpf_taken':
          return NextResponse.json({ error: 'CPF já cadastrado' }, { status: 409 })
      }
    }

    return NextResponse.json({ success: true, patient: publicPatient(result.patient) }, { status: 201 })
  } catch (error) {
    c.log.error('admin.patients.create_error', { message: error instanceof Error ? error.name : 'unknown' })
    return NextResponse.json({ error: 'Erro ao processar requisição' }, { status: 500 })
  }
}
