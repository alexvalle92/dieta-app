// Id do envio do formulário de renovação, gerado no navegador.
// `crypto.randomUUID` só existe em contexto seguro (HTTPS ou localhost); aberto por HTTP num IP da rede ele falta
// e o clique em "Enviar" não faria nada. `getRandomValues` existe em qualquer contexto: com ele sai um UUID v4.

type CryptoLike = {
  getRandomValues(array: Uint8Array): Uint8Array
  randomUUID?: () => string
}

export function newSubmissionId(c: CryptoLike = globalThis.crypto): string {
  if (typeof c.randomUUID === "function") {
    try {
      return c.randomUUID()
    } catch {
      // Segue para o gerador abaixo.
    }
  }
  const bytes = c.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40 // versão 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80 // variante RFC 4122
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
