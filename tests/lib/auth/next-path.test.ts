import { describe, expect, it } from "vitest"
import { safeNextPath } from "@/lib/auth/next-path"

describe("safeNextPath", () => {
  it.each(["/cliente/planos/abc/renovar", "/cliente/dashboard"])("aceita %s como veio", (path) => {
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
})
