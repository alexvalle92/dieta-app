import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, newPassword } = body

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: 'Token e nova senha são obrigatórios' },
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

    const { data: resetToken, error: tokenError } = await supabase
      .from('password_reset_tokens')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .single()

    if (tokenError || !resetToken) {
      return NextResponse.json(
        { error: 'Token inválido ou já utilizado' },
        { status: 400 }
      )
    }

    const now = new Date()
    const expiresAt = new Date(resetToken.expires_at)

    if (now > expiresAt) {
      return NextResponse.json(
        { error: 'Token expirado. Solicite um novo link de recuperação' },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)

    const { error: updateError } = await supabase
      .from('patients')
      .update({ password: hashedPassword })
      .eq('id', resetToken.patient_id)

    if (updateError) {
      throw updateError
    }

    await supabase
      .from('password_reset_tokens')
      .update({ used: true })
      .eq('id', resetToken.id)

    return NextResponse.json({ 
      success: true, 
      message: 'Senha redefinida com sucesso!' 
    })
  } catch (error) {
    console.error('Verify reset token error:', error)
    return NextResponse.json(
      { error: 'Erro ao redefinir senha' },
      { status: 500 }
    )
  }
}
