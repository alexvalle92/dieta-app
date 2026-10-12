import { describe, expect, it } from "vitest"
import { parseEnv } from "@/lib/env"

const valid: Record<string, string | undefined> = {
  DATABASE_URL: "mysql://u:p@localhost:3306/db",
  SESSION_SECRET: "s".repeat(32),
  APP_URL: "https://plana.example.com",
  FORMS_INTERNAL_URL: "http://forms:5000",
  JOBS_TOKEN: "j".repeat(32),
}

describe("parseEnv", () => {
  it("aceita o conjunto mínimo e aplica os padrões", () => {
    const env = parseEnv(valid)
    expect(env.ADMIN_NAME).toBe("Administrador")
    expect(env.NOTIFY_EMAIL_ENABLED).toBe(true)
    expect(env.NOTIFY_WHATSAPP_ENABLED).toBe(true)
    expect(env.ADMIN_EMAIL).toBeUndefined()
    expect(env.ADMIN_PASSWORD).toBeUndefined()
  })

  it("aceita o admin inicial e os canais desligados", () => {
    const env = parseEnv({
      ...valid,
      ADMIN_EMAIL: "admin@plana.example.com",
      ADMIN_PASSWORD: "x".repeat(12),
      ADMIN_NAME: "Tâmili",
      NOTIFY_EMAIL_ENABLED: "false",
      NOTIFY_WHATSAPP_ENABLED: "false",
    })
    expect(env).toMatchObject({
      ADMIN_EMAIL: "admin@plana.example.com",
      ADMIN_NAME: "Tâmili",
      NOTIFY_EMAIL_ENABLED: false,
      NOTIFY_WHATSAPP_ENABLED: false,
    })
  })

  it.each([
    ["SESSION_SECRET com 31 caracteres", { SESSION_SECRET: "s".repeat(31) }, "SESSION_SECRET"],
    ["JOBS_TOKEN com 31 caracteres", { JOBS_TOKEN: "j".repeat(31) }, "JOBS_TOKEN"],
    ["APP_URL sem esquema", { APP_URL: "plana.example.com" }, "APP_URL"],
    ["FORMS_INTERNAL_URL sem esquema", { FORMS_INTERNAL_URL: "forms:5000" }, "FORMS_INTERNAL_URL"],
    ["ADMIN_PASSWORD com 11 caracteres", { ADMIN_PASSWORD: "x".repeat(11) }, "ADMIN_PASSWORD"],
    ["ADMIN_EMAIL inválido", { ADMIN_EMAIL: "nao-e-email" }, "ADMIN_EMAIL"],
    ["NOTIFY_EMAIL_ENABLED fora de true/false", { NOTIFY_EMAIL_ENABLED: "sim" }, "NOTIFY_EMAIL_ENABLED"],
    ["DATABASE_URL vazia", { DATABASE_URL: "" }, "DATABASE_URL"],
    ["ADMIN_NAME vazio", { ADMIN_NAME: "" }, "ADMIN_NAME"],
  ])("recusa %s e cita o nome da variável", (_name, override, variable) => {
    expect(() => parseEnv({ ...valid, ...override })).toThrow(new RegExp(variable))
  })

  it("lista todas as variáveis ausentes de uma vez", () => {
    expect(() => parseEnv({})).toThrow(
      /DATABASE_URL.*SESSION_SECRET.*APP_URL.*FORMS_INTERNAL_URL.*JOBS_TOKEN/,
    )
  })

  it("a mensagem de erro nunca traz o valor recebido", () => {
    const secret = "valor-secreto-curto"
    try {
      parseEnv({ ...valid, SESSION_SECRET: secret })
      throw new Error("deveria lançar")
    } catch (err) {
      expect((err as Error).message).not.toContain(secret)
    }
  })
})
