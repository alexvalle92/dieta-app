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
    const { name, cpf, email, phone, password } = body

    if (!name || !cpf || !email || !phone || !password) {
      return NextResponse.json(
        { error: 'Todos os campos são obrigatórios' },
        { status: 400 }
      )
    }

    const cpfNumbers = cpf.replace(/\D/g, '')

    if (cpfNumbers.length !== 11) {
      return NextResponse.json(
        { error: 'CPF inválido' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'A senha deve ter pelo menos 6 caracteres' },
        { status: 400 }
      )
    }

    const supabase = supabaseAdmin

    const { data: existingCPF } = await supabase
      .from('patients')
      .select('id')
      .eq('cpf', cpfNumbers)
      .single()

    if (existingCPF) {
      return NextResponse.json(
        { error: 'CPF já cadastrado' },
        { status: 400 }
      )
    }

    const { data: existingEmail } = await supabase
      .from('patients')
      .select('id')
      .eq('email', email)
      .single()

    if (existingEmail) {
      return NextResponse.json(
        { error: 'E-mail já cadastrado' },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const { data: patient, error } = await supabase
      .from('patients')
      .insert([
        {
          name,
          cpf: cpfNumbers,
          email,
          phone,
          password: hashedPassword,
        },
      ])
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      patient: {
        id: patient.id,
        name: patient.name,
        email: patient.email,
        cpf: patient.cpf,
      },
    })
  } catch (error) {
    console.error('Create patient error:', error)
    return NextResponse.json(
      { error: 'Erro ao criar paciente' },
      { status: 500 }
    )
  }
}
