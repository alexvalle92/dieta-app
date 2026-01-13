import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/server/db'
import { admins } from '@/shared/schema'
import { hashSHA512 } from '@/lib/crypto-utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password, cpf, phone, crn } = body

    if (!name || !email || !password || !cpf || !phone || !crn) {
      return NextResponse.json(
        { error: 'Todos os campos são obrigatórios' },
        { status: 400 }
      )
    }

    const hashedPassword = hashSHA512(password)

    const [admin] = await db
      .insert(admins)
      .values({
        name,
        email,
        password: hashedPassword,
        cpf,
        phone,
        crn,
      })
      .returning()

    return NextResponse.json({ success: true, admin })
  } catch (error) {
    console.error('Error in admin setup:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
