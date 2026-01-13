import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/server/db'
import { patients } from '@/shared/schema'
import { eq } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import { hashSHA512 } from '@/lib/crypto-utils'

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth('admin')
    
    if (!session) {
      return NextResponse.json(
        { error: 'Acesso não autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { patientId, newPassword } = body

    if (!patientId || !newPassword) {
      return NextResponse.json(
        { error: 'ID do paciente e nova senha são obrigatórios' },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'A nova senha deve ter pelo menos 6 caracteres' },
        { status: 400 }
      )
    }

    const [patient] = await db
      .select({ id: patients.id, name: patients.name })
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1)

    if (!patient) {
      return NextResponse.json(
        { error: 'Paciente não encontrado' },
        { status: 404 }
      )
    }

    const hashedPassword = hashSHA512(newPassword)

    await db
      .update(patients)
      .set({ password: hashedPassword })
      .where(eq(patients.id, patientId))

    return NextResponse.json({
      success: true,
      message: `Senha do paciente ${patient.name} redefinida com sucesso`,
    })
  } catch (error) {
    console.error('Admin password reset error:', error)
    return NextResponse.json(
      { error: 'Erro ao redefinir senha' },
      { status: 500 }
    )
  }
}
