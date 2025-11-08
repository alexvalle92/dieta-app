import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import bcrypt from 'bcryptjs'

export async function POST() {
  try {
    const defaultPassword = await bcrypt.hash('senha123', 10)

    const fakePatients = [
      {
        name: 'Maria Silva',
        cpf: '123.456.789-01',
        email: 'maria.silva@email.com',
        phone: '(11) 98765-4321',
        password: defaultPassword,
        quiz_responses: {
          peso: 75,
          altura: 1.65,
          objetivo: 'emagrecimento',
          restricoes: 'nenhuma',
        },
      },
      {
        name: 'João Santos',
        cpf: '234.567.890-12',
        email: 'joao.santos@email.com',
        phone: '(21) 97654-3210',
        password: defaultPassword,
        quiz_responses: {
          peso: 90,
          altura: 1.78,
          objetivo: 'emagrecimento',
          restricoes: 'lactose',
        },
      },
      {
        name: 'Ana Paula Oliveira',
        cpf: '345.678.901-23',
        email: 'ana.oliveira@email.com',
        phone: '(31) 96543-2109',
        password: defaultPassword,
        quiz_responses: {
          peso: 68,
          altura: 1.60,
          objetivo: 'emagrecimento',
          restricoes: 'glúten',
        },
      },
      {
        name: 'Carlos Eduardo Lima',
        cpf: '456.789.012-34',
        email: 'carlos.lima@email.com',
        phone: '(41) 95432-1098',
        password: defaultPassword,
        quiz_responses: {
          peso: 85,
          altura: 1.75,
          objetivo: 'emagrecimento',
          restricoes: 'nenhuma',
        },
      },
      {
        name: 'Fernanda Costa',
        cpf: '567.890.123-45',
        email: 'fernanda.costa@email.com',
        phone: '(51) 94321-0987',
        password: defaultPassword,
        quiz_responses: {
          peso: 72,
          altura: 1.68,
          objetivo: 'emagrecimento',
          restricoes: 'vegetariana',
        },
      },
    ]

    const { data, error } = await supabaseAdmin
      .from('patients')
      .insert(fakePatients)
      .select()

    if (error) {
      console.error('Error seeding patients:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `${data.length} pacientes fictícios criados com sucesso`,
      patients: data,
    })
  } catch (error) {
    console.error('Error in seed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
