import { NextResponse } from "next/server"
import { destroySession } from "@/lib/auth/session"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST() {
  try {
    await destroySession()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Logout error:", error instanceof Error ? error.name : "unknown")
    return NextResponse.json({ error: "Erro ao processar logout" }, { status: 500 })
  }
}
