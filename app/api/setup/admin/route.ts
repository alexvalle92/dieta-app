import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

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

    const hashedPassword = await bcrypt.hash(password, 10)

    const { data, error } = await supabase
      .from('admins')
      .insert([
        {
          name,
          email,
          password: hashedPassword,
          cpf,
          phone,
          crn,
        },
      ])
      .select()

    if (error) {
      console.error('Error creating admin:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, admin: data[0] })
  } catch (error) {
    console.error('Error in admin setup:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
