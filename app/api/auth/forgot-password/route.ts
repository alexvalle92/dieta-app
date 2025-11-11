import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { cpf } = body

    if (!cpf) {
      return NextResponse.json(
        { error: 'CPF é obrigatório' },
        { status: 400 }
      )
    }

    const cpfNumbers = cpf.replace(/\D/g, '')

    const supabase = supabaseAdmin

    const { data: patient, error } = await supabase
      .from('patients')
      .select('id, name, email')
      .eq('cpf', cpfNumbers)
      .single()

    if (error || !patient) {
      return NextResponse.json(
        { error: 'CPF não encontrado no sistema' },
        { status: 404 }
      )
    }

    const token = crypto.randomBytes(32).toString('hex')
    
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 1)

    await supabase
      .from('password_reset_tokens')
      .update({ used: true })
      .eq('patient_id', patient.id)
      .eq('used', false)

    const { data: resetTokenData, error: tokenError } = await supabase
      .from('password_reset_tokens')
      .insert({
        patient_id: patient.id,
        token,
        expires_at: expiresAt.toISOString(),
      })
      .select()

    if (tokenError) {
      console.error('Error creating reset token:', tokenError)
      return NextResponse.json(
        { error: 'Erro ao gerar link de recuperação. Verifique se a tabela password_reset_tokens foi criada no Supabase.' },
        { status: 500 }
      )
    }

    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5000'}/cliente/redefinir-senha/${token}`

    return NextResponse.json({ 
      success: true, 
      message: 'Link de recuperação gerado com sucesso',
      resetLink,
      email: patient.email,
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: 'Erro ao processar solicitação de recuperação' },
      { status: 500 }
    )
  }
}
