import { randomUUID } from "node:crypto"
import { eq } from "drizzle-orm"
import type mysql from "mysql2/promise"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import type { Db } from "@/lib/db/client"
import { mealPlans, notifications, passwordResetTokens, patients } from "@/lib/db/schema"
import { createPatientRepo } from "@/lib/repos/patients"
import { createResetTokenRepo } from "@/lib/repos/reset-tokens"
import type { PatientRepo } from "@/lib/repos/types"
import { randomCpf, seedQuizPatient } from "../helpers/seed"
import { mysqlTestsEnabled, openTestDb, truncateAll } from "../helpers/test-db"

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

describe.skipIf(!mysqlTestsEnabled)("PatientRepo (MySQL)", () => {
  let db: Db
  let pool: mysql.Pool
  let repo: PatientRepo

  beforeAll(async () => {
    ;({ db, pool } = await openTestDb())
    repo = createPatientRepo(db)
  }, 60_000)

  beforeEach(async () => {
    await truncateAll(pool)
  })

  afterAll(async () => {
    await pool?.end()
  })

  const newPatient = (over: Partial<Parameters<PatientRepo["create"]>[0]> = {}) => ({
    name: "Ana Souza",
    cpf: randomCpf(),
    email: "ana@example.com",
    phone: "11987654321",
    passwordHash: "scrypt$hash",
    ...over,
  })

  it("create devolve a linha com a troca de senha pendente e grava password_set_at", async () => {
    const created = await repo.create(newPatient())
    if (created === "cpf_taken") throw new Error("cpf_taken inesperado")

    expect(created).toMatchObject({
      name: "Ana Souza",
      email: "ana@example.com",
      phone: "11987654321",
      passwordHash: "scrypt$hash",
      mustChangePassword: true,
    })
    const [row] = await db.select().from(patients).where(eq(patients.id, created.id))
    expect(row.passwordSetAt).toBeInstanceOf(Date)
  })

  it("create com CPF repetido → cpf_taken; com o mesmo e-mail e outro CPF é aceito", async () => {
    const first = newPatient()
    expect(await repo.create(first)).not.toBe("cpf_taken")

    expect(await repo.create({ ...first, email: "outro@example.com" })).toBe("cpf_taken")
    expect(await repo.create(newPatient({ email: first.email }))).not.toBe("cpf_taken")
  })

  it("findByCpf e getById devolvem o paciente; desconhecidos → null", async () => {
    const created = await repo.create(newPatient({ cpf: "52998224725" }))
    if (created === "cpf_taken") throw new Error("cpf_taken inesperado")

    expect((await repo.findByCpf("52998224725"))?.id).toBe(created.id)
    expect((await repo.getById(created.id))?.cpf).toBe("52998224725")
    expect(await repo.findByCpf("00000000000")).toBeNull()
    expect(await repo.getById(randomUUID())).toBeNull()
  })

  it("findByEmail devolve no máximo 2 linhas, ignorando maiúsculas", async () => {
    await repo.create(newPatient({ email: "dupla@example.com" }))
    expect(await repo.findByEmail("dupla@example.com")).toHaveLength(1)
    expect(await repo.findByEmail("DUPLA@Example.com")).toHaveLength(1)

    await repo.create(newPatient({ email: "dupla@example.com" }))
    expect(await repo.findByEmail("dupla@example.com")).toHaveLength(2)

    await repo.create(newPatient({ email: "dupla@example.com" }))
    expect(await repo.findByEmail("dupla@example.com")).toHaveLength(2)
  })

  it("list: do mais novo ao mais antigo; busca por nome, e-mail e CPF", async () => {
    const ana = await repo.create(newPatient({ name: "Ana Souza", email: "ana@example.com", cpf: "52998224725" }))
    await sleep(5)
    const bruno = await repo.create(newPatient({ name: "Bruno Lima", email: "bruno@example.com", cpf: "11144477735" }))
    if (ana === "cpf_taken" || bruno === "cpf_taken") throw new Error("cpf_taken inesperado")

    expect((await repo.list("")).map((p) => p.id)).toEqual([bruno.id, ana.id])
    expect((await repo.list("ANA")).map((p) => p.id)).toEqual([ana.id])
    expect((await repo.list("bruno@")).map((p) => p.id)).toEqual([bruno.id])
    expect((await repo.list("529982")).map((p) => p.id)).toEqual([ana.id])
    expect((await repo.list("529.982")).map((p) => p.id)).toEqual([ana.id])
    expect(await repo.list("zzz-ninguem")).toEqual([])
  })

  it("list trata % e _ da busca como texto, não como curinga", async () => {
    await repo.create(newPatient({ name: "Ana Souza" }))
    expect(await repo.list("%")).toEqual([])
    expect(await repo.list("A_a")).toEqual([])
  })

  it("update altera nome, e-mail e telefone; id inexistente → null", async () => {
    const created = await repo.create(newPatient())
    if (created === "cpf_taken") throw new Error("cpf_taken inesperado")

    const updated = await repo.update(created.id, { name: "Ana Maria", email: "nova@example.com", phone: "" })
    expect(updated).toMatchObject({ name: "Ana Maria", email: "nova@example.com", phone: "" })
    expect(await repo.update(randomUUID(), { name: "X", email: "x@example.com", phone: "" })).toBeNull()
  })

  it("setPassword grava o hash e a marca; id inexistente → false", async () => {
    const created = await repo.create(newPatient())
    if (created === "cpf_taken") throw new Error("cpf_taken inesperado")

    expect(await repo.setPassword(created.id, { passwordHash: "novo", mustChangePassword: false })).toBe(true)
    expect(await repo.getById(created.id)).toMatchObject({ passwordHash: "novo", mustChangePassword: false })
    expect(await repo.setPassword(randomUUID(), { passwordHash: "x", mustChangePassword: true })).toBe(false)
  })

  describe("delete", () => {
    it("paciente do quiz → has_history, e a linha continua", async () => {
      const { patientId } = await seedQuizPatient(db)

      expect(await repo.delete(patientId)).toBe("has_history")
      expect(await repo.getById(patientId)).not.toBeNull()
    })

    it("paciente criado pelo admin: apaga tokens, mensagens, planos manuais e o paciente", async () => {
      const created = await repo.create(newPatient())
      if (created === "cpf_taken") throw new Error("cpf_taken inesperado")
      await createResetTokenRepo(db).createRequest({
        patientId: created.id,
        tokenHash: "a".repeat(64),
        expiresAt: new Date(Date.now() + 3_600_000),
        link: "https://plana.test/cliente/redefinir-senha/x",
        recipients: [{ channel: "email", recipient: "ana@example.com" }],
        now: new Date(),
      })
      await db.insert(mealPlans).values({
        id: randomUUID(),
        patientId: created.id,
        title: "Plano manual",
        startDate: "2026-10-12",
        status: "active",
        planData: {},
      })

      expect(await repo.delete(created.id)).toBe("deleted")

      expect(await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.patientId, created.id))).toEqual([])
      expect(await db.select().from(notifications).where(eq(notifications.patientId, created.id))).toEqual([])
      expect(await db.select().from(mealPlans).where(eq(mealPlans.patientId, created.id))).toEqual([])
      expect(await db.select().from(patients).where(eq(patients.id, created.id))).toEqual([])
    })

    it("id inexistente → not_found", async () => {
      expect(await repo.delete(randomUUID())).toBe("not_found")
    })
  })
})
