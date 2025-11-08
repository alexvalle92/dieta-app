import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import bcrypt from 'bcryptjs'

export async function POST() {
  try {
    const defaultPassword = await bcrypt.hash('senha123', 10)

    const { data: existingPatients } = await supabaseAdmin
      .from('patients')
      .select('cpf')

    if (existingPatients && existingPatients.length > 0) {
      await supabaseAdmin
        .from('patients')
        .delete()
        .neq('cpf', '')
    }

    const fakePatients = [
      {
        name: 'Maria Silva',
        cpf: '12345678901',
        email: 'maria.silva@email.com',
        phone: '11987654321',
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
        cpf: '23456789012',
        email: 'joao.santos@email.com',
        phone: '21976543210',
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
        cpf: '34567890123',
        email: 'ana.oliveira@email.com',
        phone: '31965432109',
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
        cpf: '45678901234',
        email: 'carlos.lima@email.com',
        phone: '41954321098',
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
        cpf: '56789012345',
        email: 'fernanda.costa@email.com',
        phone: '51943210987',
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
