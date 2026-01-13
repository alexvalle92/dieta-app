import { NextResponse } from 'next/server'
import { db } from '@/server/db'
import { patients } from '@/shared/schema'
import { hashSHA512 } from '@/lib/crypto-utils'
import { sql } from 'drizzle-orm'

export async function POST() {
  try {
    const defaultPassword = hashSHA512('senha123')

    await db.delete(patients)

    const fakePatients = [
      {
        name: 'Maria Silva',
        cpf: '12345678901',
        email: 'maria.silva@email.com',
        phone: '11987654321',
        password: defaultPassword,
        planData: {
          peso: 75,
          altura: 1.65,
          objetivo: 'emagrecimento',
          restricoes: 'nenhuma',
        },
      },
      // ... (outros pacientes omitidos para brevidade, mas devem seguir o mesmo padrão)
    ]

    const data = await db.insert(patients).values(fakePatients).returning()

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
