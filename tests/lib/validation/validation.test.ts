import { describe, expect, it } from "vitest"
import { normalizeEmail, normalizePhone } from "@/lib/validation/contact"
import { isValidCpf, onlyDigits } from "@/lib/validation/cpf"
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  isAcceptablePassword,
} from "@/lib/validation/password"

describe("cpf", () => {
  it("aceita CPF válido com ou sem pontuação", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true)
    expect(isValidCpf("52998224725")).toBe(true)
  })

  it.each(["111.111.111-11", "529.982.247-24", "123", "", "abcdefghijk"])("recusa %j", (cpf) => {
    expect(isValidCpf(cpf)).toBe(false)
  })

  it("onlyDigits tira tudo que não é dígito", () => {
    expect(onlyDigits("529.982.247-25")).toBe("52998224725")
  })
})

describe("password", () => {
  it("limites de 8 e 200 caracteres", () => {
    expect(MIN_PASSWORD_LENGTH).toBe(8)
    expect(MAX_PASSWORD_LENGTH).toBe(200)
    expect(isAcceptablePassword("x".repeat(8))).toBe(true)
    expect(isAcceptablePassword("x".repeat(200))).toBe(true)
    expect(isAcceptablePassword("x".repeat(7))).toBe(false)
    expect(isAcceptablePassword("x".repeat(201))).toBe(false)
  })

  it.each([undefined, null, 12345678, {}, ["abcdefgh"]])("recusa valor que não é texto: %j", (value) => {
    expect(isAcceptablePassword(value)).toBe(false)
  })
})

describe("contact", () => {
  it("normalizeEmail apara e põe em minúsculas", () => {
    expect(normalizeEmail(" Ana@Gmail.com ")).toBe("ana@gmail.com")
  })

  it.each(["sem-arroba", "a@b", "", "   ", `${"a".repeat(250)}@example.com`])("normalizeEmail recusa %j", (v) => {
    expect(normalizeEmail(v)).toBeNull()
  })

  it.each([
    ["(11) 98765-4321", "11987654321"],
    ["(11) 3456-7890", "1134567890"],
    ["+55 (11) 98765-4321", "11987654321"],
    ["5511987654321", "11987654321"],
    ["551134567890", "1134567890"],
  ])("normalizePhone(%j) → %j (mesma regra do quiz: sem 55, 10 ou 11 dígitos)", (raw, expected) => {
    expect(normalizePhone(raw)).toBe(expected)
  })

  it.each([undefined, "", "   "])("normalizePhone devolve vazio (sem telefone) para %j", (v) => {
    expect(normalizePhone(v)).toBe("")
  })

  it.each(["123", "1".repeat(9), "1".repeat(14), "abc", "55123"])("normalizePhone recusa %j", (v) => {
    expect(normalizePhone(v)).toBeNull()
  })
})
