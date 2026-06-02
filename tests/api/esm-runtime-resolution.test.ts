// @vitest-environment node
//
// Anti-régression runtime serverless (bug prod du 2 juin 2026).
//
// La prod Vercel exécute les fonctions api/* en ESM natif Node, car
// package.json a "type": "module". Le loader ESM de Node exige des
// extensions explicites sur les imports relatifs : `import x from './y'`
// échoue à l'exécution avec ERR_MODULE_NOT_FOUND — il faut `'./y.js'`.
//
// Les autres tests importent api/_lib/* via Vitest (résolution "bundler"),
// qui tolère l'absence d'extension : ils ne voient JAMAIS ce bug. Ici on
// reproduit fidèlement le runtime :
//   1. esbuild transpile chaque fichier api/ en ESM SANS bundling
//      (bundle: false) → les specifiers relatifs sont laissés tels quels,
//      exactement comme l'émet @vercel/node.
//   2. On fait un import() dynamique de chaque handler. Si un import
//      relatif n'a pas son extension, Node jette ERR_MODULE_NOT_FOUND,
//      comme en prod, et le test échoue.
//
// La sortie est écrite sous node_modules/.cache pour que la résolution des
// dépendances bare (@anthropic-ai/sdk, firebase-admin, @vercel/node) remonte
// bien jusqu'au node_modules du projet.
import { afterAll, describe, expect, it } from 'vitest'
import { build } from 'esbuild'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(here, '../..')
const apiDir = path.join(projectRoot, 'api')

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return walk(full)
    return entry.isFile() && full.endsWith('.ts') ? [full] : []
  })
}

const apiFiles = walk(apiDir)
// Handlers = entrées de route (tout sauf les modules partagés _lib).
const handlerFiles = apiFiles.filter((f) => !f.includes(`${path.sep}_lib${path.sep}`))

const cacheDir = path.join(projectRoot, 'node_modules', '.cache')
fs.mkdirSync(cacheDir, { recursive: true })
const outRoot = fs.mkdtempSync(path.join(cacheDir, 'esm-runtime-check-'))

afterAll(() => {
  fs.rmSync(outRoot, { recursive: true, force: true })
})

async function compileApiToEsm(): Promise<void> {
  await build({
    entryPoints: apiFiles,
    outdir: outRoot,
    outbase: apiDir,
    bundle: false, // crucial : préserve les specifiers, comme @vercel/node
    format: 'esm',
    platform: 'node',
    target: 'node18',
    logLevel: 'silent',
  })
}

function emittedPathFor(srcFile: string): string {
  const rel = path.relative(apiDir, srcFile).replace(/\.ts$/, '.js')
  return path.join(outRoot, rel)
}

describe('runtime serverless ESM — les imports relatifs sous api/ doivent résoudre', () => {
  it('compile et charge chaque handler api/* sans ERR_MODULE_NOT_FOUND', async () => {
    await compileApiToEsm()

    for (const handler of handlerFiles) {
      const emitted = emittedPathFor(handler)
      const label = path.relative(projectRoot, handler)

      // import() exécute la résolution ESM native de Node, comme la prod.
      // Si un import relatif manque son extension, ceci jette ici.
      const mod = await import(pathToFileURL(emitted).href).catch((err) => {
        throw new Error(`${label} a échoué au chargement ESM : ${err}`)
      })

      // Une fonction api Vercel exporte un handler par défaut.
      expect(typeof mod.default, `${label} doit exporter un handler par défaut`).toBe(
        'function',
      )
    }
  })
})
