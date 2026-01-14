import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/server/db'
import { appSettings } from '@/shared/schema'
import { eq } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  try {
    const session = await requireAuth('admin')
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const [settings] = await db.select().from(appSettings).where(eq(appSettings.id, 'global'))
    return NextResponse.json({ settings: settings || { dietTechnicalDefinition: '' } })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar configurações' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth('admin')
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { dietTechnicalDefinition } = await request.json()

    await db.insert(appSettings)
      .values({ id: 'global', dietTechnicalDefinition })
      .onConflictDoUpdate({
        target: appSettings.id,
        set: { dietTechnicalDefinition, updatedAt: new Date() }
      })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao salvar configurações' }, { status: 500 })
  }
}
