import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth('patient')
    
    if (!session) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Senha atual e nova senha são obrigatórias' },
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
      .select('password')
      .eq('id', session.userId)
      .single()

    if (error || !patient) {
      return NextResponse.json(
        { error: 'Paciente não encontrado' },
        { status: 404 }
      )
    }

    if (!patient.password) {
      return NextResponse.json(
        { error: 'Senha não cadastrada. Entre em contato com o suporte.' },
        { status: 400 }
      )
    }

    const passwordMatch = await bcrypt.compare(currentPassword, patient.password)

    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Senha atual incorreta' },
        { status: 401 }
      )
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)

    const { error: updateError } = await supabase
      .from('patients')
      .update({ password: hashedPassword })
      .eq('id', session.userId)

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({ success: true, message: 'Senha atualizada com sucesso' })
  } catch (error) {
    console.error('Password reset error:', error)
    return NextResponse.json(
      { error: 'Erro ao redefinir senha' },
      { status: 500 }
    )
  }
}
