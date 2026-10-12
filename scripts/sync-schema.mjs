// Copia o schema do v0-tami-forms (fonte única) para lib/db/schema.ts.
// Uso: pnpm db:sync-schema   (o v0-tami-forms precisa estar em ../v0-tami-forms)
import { copyFileSync, existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const source = path.resolve(root, "../v0-tami-forms/lib/db/schema.ts")
const target = path.join(root, "lib/db/schema.ts")

if (!existsSync(source)) {
  console.error(`schema de origem não encontrado: ${source}`)
  console.error("Clone o v0-tami-forms ao lado deste repositório e rode de novo.")
  process.exit(1)
}

copyFileSync(source, target)
console.log(`schema copiado: ${path.relative(root, source)} -> ${path.relative(root, target)}`)
