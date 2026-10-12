import { getContainer } from "@/lib/container"
import { checkDatabase } from "@/lib/db/check"
import { getDb } from "@/lib/db/client"
import { getEnv } from "@/lib/env"
import { createLogger } from "@/lib/log"

/** Mensagem segura para o log: nunca a consulta nem os parâmetros que o Drizzle embute no texto. */
function safeMessage(err: unknown): string {
  if (!(err instanceof Error)) return "erro desconhecido"
  const cause: unknown = err.cause
  if (typeof cause === "object" && cause !== null) {
    const id = (cause as { code?: unknown; errno?: unknown }).code ?? (cause as { errno?: unknown }).errno
    if (id !== undefined && id !== null) return `${err.name}: ${String(id)}`
  }
  const cut = err.message.indexOf("params:")
  return (cut >= 0 ? err.message.slice(0, cut) : err.message).slice(0, 300)
}

/**
 * Boot do servidor (chamado pelo `instrumentation.ts`, só no runtime Node), na ordem de §8.1 do spec:
 * valida a env, confere o banco e cria o primeiro admin. Qualquer falha derruba o processo: melhor
 * não subir do que subir sem banco pronto ou com configuração inválida.
 */
export async function boot(): Promise<void> {
  const log = createLogger()
  try {
    const env = getEnv()

    const missing = await checkDatabase(getDb())
    if (missing.length > 0) {
      log.error("boot.schema_missing", {
        missing,
        hint: "Suba o v0-tami-forms antes: é ele que cria as tabelas.",
      })
      process.exit(1)
    }

    const admin = await getContainer().seedAdmin({
      email: env.ADMIN_EMAIL,
      password: env.ADMIN_PASSWORD,
      name: env.ADMIN_NAME,
    })
    log.info("boot.done", { admin })
  } catch (err) {
    log.error("boot.failed", { message: safeMessage(err) })
    process.exit(1)
  }
}
