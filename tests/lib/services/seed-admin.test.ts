import { describe, expect, it, vi } from "vitest"
import { verifyPassword, hashPassword } from "@/lib/auth/password-hash"
import type { Logger } from "@/lib/log"
import { createSeedAdmin } from "@/lib/services/seed-admin"

function setup(over: { count?: number; created?: "created" | "email_taken" } = {}) {
  const admins = {
    count: vi.fn(async () => over.count ?? 0),
    create: vi.fn(async (_d: { name: string; email: string; passwordHash: string }) => over.created ?? ("created" as const)),
  }
  const log: Logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
  const seed = createSeedAdmin({ admins, hashPassword, log })
  return { admins, log, seed }
}

const cfg = { email: "Admin@Plana.com", password: "senha-do-admin-123", name: "Administrador" }

describe("seedAdmin", () => {
  it("já existe algum admin → ignora as variáveis", async () => {
    const s = setup({ count: 1 })
    expect(await s.seed(cfg)).toBe("skipped_existing")
    expect(s.admins.create).not.toHaveBeenCalled()
  })

  it.each([
    ["sem e-mail", { password: "senha-do-admin-123", name: "Administrador" }],
    ["sem senha", { email: "admin@plana.com", name: "Administrador" }],
  ])("tabela vazia %s → avisa e não cria", async (_name, partial) => {
    const s = setup()

    expect(await s.seed(partial)).toBe("skipped_missing_env")

    expect(s.admins.create).not.toHaveBeenCalled()
    expect(s.log.warn).toHaveBeenCalledWith("boot.admin.missing", expect.anything())
  })

  it("tabela vazia com as duas variáveis → cria com e-mail em minúsculas e hash que confere", async () => {
    const s = setup()

    expect(await s.seed(cfg)).toBe("created")

    const created = s.admins.create.mock.calls[0][0]
    expect(created.name).toBe("Administrador")
    expect(created.email).toBe("admin@plana.com")
    expect(created.passwordHash).not.toContain(cfg.password)
    expect(await verifyPassword(cfg.password, created.passwordHash)).toBe(true)
  })

  it("outra instância criou primeiro (email_taken) → skipped_existing", async () => {
    const s = setup({ created: "email_taken" })
    expect(await s.seed(cfg)).toBe("skipped_existing")
  })

  it("a senha nunca vai para o log", async () => {
    const s = setup()
    await s.seed(cfg)
    const logged = JSON.stringify([
      ...(s.log.info as ReturnType<typeof vi.fn>).mock.calls,
      ...(s.log.warn as ReturnType<typeof vi.fn>).mock.calls,
    ])
    expect(logged).not.toContain(cfg.password)
  })
})
