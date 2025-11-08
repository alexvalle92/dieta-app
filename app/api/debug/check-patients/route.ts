import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import bcrypt from 'bcryptjs'

export async function GET() {
  try {
    const { data: patients, error } = await supabaseAdmin
      .from('patients')
      .select('id, name, cpf, email, password')
      .limit(5)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const testPassword = 'senha123'
    const patientsWithPasswordCheck = await Promise.all(
      (patients || []).map(async (patient) => {
        const hasPassword = !!patient.password
        const passwordMatches = hasPassword 
          ? await bcrypt.compare(testPassword, patient.password)
          : false
        
        return {
          cpf: patient.cpf,
          name: patient.name,
          email: patient.email,
          hasPassword,
          passwordMatches,
          passwordPreview: patient.password ? patient.password.substring(0, 15) + '...' : null
        }
      })
    )

    return NextResponse.json({
      success: true,
      count: patients?.length || 0,
      patients: patientsWithPasswordCheck
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
