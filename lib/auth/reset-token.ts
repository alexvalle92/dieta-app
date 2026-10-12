import { createHash, randomBytes } from "node:crypto"

/** SHA-256 em hexadecimal: é o que se grava em `password_reset_tokens.token_hash`. */
export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

/** Token de uso único (32 bytes em base64url, 43 caracteres) e o hash que vai para o banco. */
export function newResetToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url")
  return { token, hash: hashResetToken(token) }
}
