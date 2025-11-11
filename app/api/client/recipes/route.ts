import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth('patient')
    
    if (!session) {
      return NextResponse.json(
        { error: 'Acesso não autorizado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim().toLowerCase() || ''

    const supabase = supabaseAdmin

    const { data: recipes, error } = await supabase
      .from('recipes')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching recipes:', error)
      return NextResponse.json(
        { error: 'Erro ao buscar receitas' },
        { status: 500 }
      )
    }

    let filteredRecipes = recipes || []

    if (search) {
      filteredRecipes = filteredRecipes.filter((recipe: any) => {
        const titleMatch = recipe.title?.toLowerCase().includes(search)
        const categoryMatch = recipe.category?.toLowerCase().includes(search)
        return titleMatch || categoryMatch
      })
    }

    return NextResponse.json({ recipes: filteredRecipes })
  } catch (error) {
    console.error('Recipes fetch error:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar receitas' },
      { status: 500 }
    )
  }
}
