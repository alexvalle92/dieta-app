export const MIN_PASSWORD_LENGTH = 8
/** Teto para um corpo gigante nunca chegar ao scrypt. */
export const MAX_PASSWORD_LENGTH = 200

export const PASSWORD_LENGTH_MESSAGE = `A nova senha deve ter entre ${MIN_PASSWORD_LENGTH} e ${MAX_PASSWORD_LENGTH} caracteres`

/** Senha nova aceitável: texto com 8 a 200 caracteres. */
export function isAcceptablePassword(value: unknown): value is string {
  return typeof value === "string" && value.length >= MIN_PASSWORD_LENGTH && value.length <= MAX_PASSWORD_LENGTH
}
