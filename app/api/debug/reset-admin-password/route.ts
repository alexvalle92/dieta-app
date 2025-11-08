import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import bcrypt from 'bcryptjs'

export async function POST() {
  try {
    const newPassword = await bcrypt.hash('admin123', 10)

    const { data, error } = await supabaseAdmin
      .from('admins')
      .update({ password: newPassword })
      .eq('email', 'nutritamilivalle@gmail.com')
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Senha do admin atualizada para: admin123',
      admin: {
        name: data[0]?.name,
        email: data[0]?.email
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
