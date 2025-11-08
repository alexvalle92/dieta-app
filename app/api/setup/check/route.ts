import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('admins')
      .select('id')
      .limit(1)

    if (error) {
      console.error('Error checking admin:', error)
      return NextResponse.json({ hasAdmin: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ hasAdmin: data && data.length > 0 })
  } catch (error) {
    console.error('Error in setup check:', error)
    return NextResponse.json({ hasAdmin: false, error: 'Internal server error' }, { status: 500 })
  }
}
