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

  it("normalizePhone devolve só dígitos", () => {
    expect(normalizePhone("(11) 98765-4321")).toBe("11987654321")
  })

  it.each([undefined, "", "   ", "1".repeat(14)])("normalizePhone devolve vazio para %j", (v) => {
    expect(normalizePhone(v)).toBe("")
  })
})
