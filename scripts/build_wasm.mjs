// Build MoonBit WASM and copy to extension wasm/core.wasm
// Usage: node scripts/build_wasm.mjs
import { execSync } from 'node:child_process'
import { mkdirSync, copyFileSync, accessSync, constants as fsConstants } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const root = resolve(__dirname, '..')
const moonProj = resolve(root, 'wasm/moonbit')

function run(cmd, cwd){
  console.log(`[exec] ${cmd} (cwd=${cwd})`)
  execSync(cmd, { stdio: 'inherit', cwd })
}

try {
  run('moon build --release', moonProj)
  // Deterministic output path for wasm-gc release build
  const wasmSrc = resolve(moonProj, 'target/wasm-gc/release/build/src/main/main.wasm')
  const wasmDst = resolve(root, 'wasm/core.wasm')
  mkdirSync(resolve(root, 'wasm'), { recursive: true })
  // Verify the built artifact exists
  try { accessSync(wasmSrc, fsConstants.R_OK) } catch (err) {
    throw new Error(`Built wasm not found at ${wasmSrc}. Ensure 'moon build --release' succeeded and preferred-target=wasm-gc.`)
  }
  copyFileSync(wasmSrc, wasmDst)
  console.log(`Copied ${wasmSrc} -> ${wasmDst}`)
  console.log('Done.')
} catch (e) {
  console.error('Build failed:', e)
  process.exit(1)
}
