import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/server/db'
import { mealCategories } from '@/shared/schema'
import { eq, asc } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  try {
    const session = await requireAuth('admin')
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const categories = await db.select().from(mealCategories).orderBy(asc(mealCategories.name))
    return NextResponse.json({ categories })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar categorias de refeição' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth('admin')
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { name } = await request.json()
    if (!name) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })

    const [category] = await db.insert(mealCategories).values({ name }).returning()
    return NextResponse.json({ success: true, category })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao salvar categoria de refeição' }, { status: 500 })
  }
}
