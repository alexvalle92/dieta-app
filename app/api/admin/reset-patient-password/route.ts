import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/guards'
import { getContainer } from '@/lib/container'
import { readInput } from '@/lib/http/read-input'
import { PASSWORD_LENGTH_MESSAGE } from '@/lib/validation/password'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Redefine a senha de um paciente; o paciente precisa trocá-la no próximo acesso. */
export async function POST(request: NextRequest) {
  const c = getContainer()
  try {
    const guard = await requireAdmin()
    if (!guard.ok) return guard.response

    const { patientId, newPassword } = await readInput(request)
    if (typeof patientId !== 'string' || patientId === '' || typeof newPassword !== 'string' || newPassword === '') {
      return NextResponse.json({ error: 'ID do paciente e nova senha são obrigatórios' }, { status: 400 })
    }

    const result = await c.patientAdmin.resetPassword(patientId, newPassword)
    if (result === 'invalid_password') {
      return NextResponse.json({ error: PASSWORD_LENGTH_MESSAGE }, { status: 400 })
    }
    if (result === 'not_found') {
      return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
    }

    const patient = await c.repos.patients.getById(patientId)
    return NextResponse.json({
      success: true,
      message: patient
        ? `Senha do paciente ${patient.name} redefinida com sucesso`
        : 'Senha do paciente redefinida com sucesso',
    })
  } catch (error) {
    c.log.error('admin.reset_patient_password.error', { message: error instanceof Error ? error.name : 'unknown' })
    return NextResponse.json({ error: 'Erro ao redefinir senha' }, { status: 500 })
  }
}
