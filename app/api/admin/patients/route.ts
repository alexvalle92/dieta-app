import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-server'
import bcrypt from 'bcryptjs'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    
    if (!session || session.userType !== 'admin') {
      return NextResponse.json(
        { error: 'Acesso não autorizado' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''

    let query = supabaseAdmin
      .from('patients')
      .select('id, name, email, cpf, phone, created_at')
      .order('created_at', { ascending: false })

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,cpf.ilike.%${search}%`)
    }

    const { data: patients, error } = await query

    if (error) {
      console.error('Error fetching patients:', error)
      return NextResponse.json(
        { error: 'Erro ao buscar pacientes' },
        { status: 500 }
      )
    }

    return NextResponse.json({ patients })
  } catch (error) {
    console.error('Error in GET /api/admin/patients:', error)
    return NextResponse.json(
      { error: 'Erro ao processar requisição' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    
    if (!session || session.userType !== 'admin') {
      return NextResponse.json(
        { error: 'Acesso não autorizado' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, email, cpf, phone, password } = body

    if (!name || !email || !cpf || !password) {
      return NextResponse.json(
        { error: 'Nome, email, CPF e senha são obrigatórios' },
        { status: 400 }
      )
    }

    const cpfNumbers = cpf.replace(/\D/g, '')

    const { data: existingPatient } = await supabaseAdmin
      .from('patients')
      .select('id')
      .or(`cpf.eq.${cpfNumbers},email.eq.${email}`)
      .single()

    if (existingPatient) {
      return NextResponse.json(
        { error: 'CPF ou email já cadastrado' },
        { status: 409 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const { data: newPatient, error } = await supabaseAdmin
      .from('patients')
      .insert({
        name,
        email,
        cpf: cpfNumbers,
        phone: phone?.replace(/\D/g, '') || null,
        password: hashedPassword,
      })
      .select('id, name, email, cpf, phone, created_at')
      .single()

    if (error) {
      console.error('Error creating patient:', error)
      return NextResponse.json(
        { error: 'Erro ao criar paciente' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { 
        success: true,
        patient: newPatient 
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error in POST /api/admin/patients:', error)
    return NextResponse.json(
      { error: 'Erro ao processar requisição' },
      { status: 500 }
    )
  }
}
