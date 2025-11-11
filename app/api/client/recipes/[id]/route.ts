import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth('patient')
    
    if (!session) {
      return NextResponse.json(
        { error: 'Acesso não autorizado' },
        { status: 401 }
      )
    }

    const { id } = await context.params
    const supabase = supabaseAdmin

    const { data: recipe, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !recipe) {
      return NextResponse.json(
        { error: 'Receita não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({ recipe })
  } catch (error) {
    console.error('Recipe fetch error:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar receita' },
      { status: 500 }
    )
  }
}
