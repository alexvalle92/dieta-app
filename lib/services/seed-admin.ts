import type { Logger } from "@/lib/log"
import type { AdminRepo } from "@/lib/repos/types"

export type SeedAdminResult = "created" | "skipped_existing" | "skipped_missing_env"

/**
 * Primeiro admin (§8.1 do spec): cria o admin das variáveis `ADMIN_*` só se a tabela está vazia.
 * Com algum admin já cadastrado as variáveis são ignoradas (mudar `ADMIN_PASSWORD` depois não
 * troca a senha). Nunca registra a senha.
 */
export function createSeedAdmin(d: {
  admins: Pick<AdminRepo, "count" | "create">
  hashPassword: (password: string) => Promise<string>
  log: Logger
}): (cfg: { email?: string; password?: string; name: string }) => Promise<SeedAdminResult> {
  return async function seedAdmin(cfg) {
    if ((await d.admins.count()) > 0) return "skipped_existing"

    if (!cfg.email || !cfg.password) {
      d.log.warn("boot.admin.missing", {
        message: "Nenhum admin cadastrado e ADMIN_EMAIL/ADMIN_PASSWORD não definidos: ninguém conseguirá entrar no painel.",
      })
      return "skipped_missing_env"
    }

    const email = cfg.email.trim().toLowerCase()
    const result = await d.admins.create({ name: cfg.name, email, passwordHash: await d.hashPassword(cfg.password) })
    if (result === "email_taken") return "skipped_existing"

    d.log.info("boot.admin.created", { email })
    return "created"
  }
}
