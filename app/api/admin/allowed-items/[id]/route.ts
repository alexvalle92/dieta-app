import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/guards'
import { getContainer } from '@/lib/container'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const c = getContainer()
  try {
    const guard = await requireAdmin()
    if (!guard.ok) return guard.response

    const { id } = await params
    if (!id) return NextResponse.json({ error: 'ID não fornecido' }, { status: 400 })

    await c.repos.mealConfig.deleteAllowedItem(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    c.log.error('admin.allowed_items.delete_error', { message: error instanceof Error ? error.name : 'unknown' })
    return NextResponse.json({ error: 'Erro ao excluir item permitido' }, { status: 500 })
  }
}
