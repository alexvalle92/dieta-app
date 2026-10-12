const MYSQL_DUPLICATE_ENTRY = 1062

type MysqlErrorLike = { errno: number }

/** O Drizzle embrulha o erro do mysql2 em `cause`; percorre a cadeia até achar o `errno`. */
function findMysqlError(error: unknown): MysqlErrorLike | null {
  let current: unknown = error
  for (let depth = 0; depth < 5 && current && typeof current === "object"; depth++) {
    if (typeof (current as { errno?: unknown }).errno === "number") return current as MysqlErrorLike
    current = (current as { cause?: unknown }).cause
  }
  return null
}

/** Violação de chave única (ER_DUP_ENTRY). */
export function isDuplicateEntry(error: unknown): boolean {
  return findMysqlError(error)?.errno === MYSQL_DUPLICATE_ENTRY
}

/** Linhas casadas por um UPDATE/DELETE (o mysql2 conta linhas encontradas, não só as alteradas). */
export const affectedRows = (result: unknown): number => (result as [{ affectedRows: number }])[0].affectedRows

/** Escapa `\`, `%` e `_` para que o texto da busca valha como texto num LIKE. */
export const escapeLike = (text: string): string => text.replace(/[\\%_]/g, (c) => `\\${c}`)
