import { describe, expect, it } from "vitest"
import { safeNextPath } from "@/lib/auth/next-path"

describe("safeNextPath", () => {
  it.each([
    "/cliente/planos/abc/renovar",
    "/cliente/dashboard",
    "/cliente/",
    "/cliente/planos?aba=historico",
    "/cliente/planos/abc..def",
    "/cliente/planos/.oculto",
    "/cliente/planos/v1.2",
  ])("aceita %s como veio", (path) => {
    expect(safeNextPath(path)).toBe(path)
  })

  it.each<[string | null | undefined, string]>([
    [null, "null"],
    [undefined, "undefined"],
    ["", "vazio"],
    ["/admin/dashboard", "fora de /cliente/"],
    ["https://evil.example/cliente/", "URL absoluta"],
    ["//evil.example/cliente/", "protocolo relativo"],
    ["/cliente//evil.example", "barra dupla no meio"],
    ["/cliente/\\evil", "barra invertida"],
    ["/cliente", "sem a barra final"],
    ["cliente/planos", "sem a barra inicial"],
  ])("recusa %j (%s)", (raw) => {
    expect(safeNextPath(raw)).toBeNull()
  })

  // Segmento "." ou "..", também codificado (%2e, maiúsculo ou minúsculo): o navegador resolve e sai de /cliente/.
  it.each([
    "/cliente/../admin/dashboard",
    "/cliente/./dashboard",
    "/cliente/planos/..",
    "/cliente/planos/.",
    "/cliente/..?x=1",
    "/cliente/..#topo",
    "/cliente/%2e%2e/admin/dashboard",
    "/cliente/%2E%2E/admin/dashboard",
    "/cliente/%2e%2E/admin",
    "/cliente/.%2e/admin/dashboard",
    "/cliente/.%2E/admin/dashboard",
    "/cliente/%2e./admin/dashboard",
    "/cliente/%2E./admin/dashboard",
    "/cliente/%2e/dashboard",
    "/cliente/%2E/dashboard",
  ])("recusa o segmento de ponto em %j", (raw) => {
    expect(safeNextPath(raw)).toBeNull()
  })

  it.each<[string, string]>([
    ["/cliente/planos\t", "tab"],
    ["/cliente/plan\nos", "quebra de linha"],
    ["/cliente/planos\r", "retorno de carro"],
    ["/cliente/\u0000planos", "NUL"],
    ["/cliente/planos\u001f", "U+001F"],
    ["/cliente/planos\u007f", "DEL"],
  ])("recusa caractere de controle (%s)", (raw) => {
    expect(safeNextPath(raw)).toBeNull()
  })
})
