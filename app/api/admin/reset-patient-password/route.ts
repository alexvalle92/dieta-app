import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/auth'

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

    const supabase = supabaseAdmin

    const { data: patient, error } = await supabase
      .from('patients')
      .select('id, name')
      .eq('id', patientId)
      .single()

    if (error || !patient) {
      return NextResponse.json(
        { error: 'Paciente não encontrado' },
        { status: 404 }
      )
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)

    const { error: updateError } = await supabase
      .from('patients')
      .update({ password: hashedPassword })
      .eq('id', patientId)

    if (updateError) {
      throw updateError
    }

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
