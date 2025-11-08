import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import bcrypt from 'bcryptjs'

export async function GET() {
  try {
    const { data: admins, error } = await supabaseAdmin
      .from('admins')
      .select('id, name, email, password')
      .limit(5)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const testPassword = 'admin123'
    const adminsWithPasswordCheck = await Promise.all(
      (admins || []).map(async (admin) => {
        const hasPassword = !!admin.password
        const passwordMatches = hasPassword 
          ? await bcrypt.compare(testPassword, admin.password)
          : false
        
        return {
          name: admin.name,
          email: admin.email,
          hasPassword,
          passwordMatches,
          passwordPreview: admin.password ? admin.password.substring(0, 15) + '...' : null
        }
      })
    )

    return NextResponse.json({
      success: true,
      count: admins?.length || 0,
      admins: adminsWithPasswordCheck
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
