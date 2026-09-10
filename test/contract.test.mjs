import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { pathToFileURL, fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'))

test('package is named dsh-prompt-optimizer', () => {
  assert.equal(pkg.name, 'dsh-prompt-optimizer')
})

test('declares a dsh.bundle manifest (installable via `dsh plugin add`)', () => {
  assert.ok(pkg.dsh?.bundle, 'package.json must declare `dsh.bundle`')
  assert.equal(pkg.dsh.bundle.patch, './cordis.patch.yml')
})

test('declares a web client half', () => {
  assert.equal(pkg.dsh?.client?.platform, 'web')
})

test('bundle patch file exists and names this package', () => {
  const patchFile = path.join(root, pkg.dsh.bundle.patch)
  assert.ok(existsSync(patchFile), 'cordis.patch.yml must sit next to package.json')
  const text = readFileSync(patchFile, 'utf8')
  assert.match(text, /id:\s*dsh-prompt-optimizer/)
  assert.match(text, /name:\s*dsh-prompt-optimizer/)
})

test('host half exports name / inject / apply', async () => {
  const host = await import(pathToFileURL(path.join(root, 'lib/index.js')).href)
  assert.equal(host.name, 'dsh-prompt-optimizer')
  assert.ok(Array.isArray(host.inject), 'inject should list hard dependencies')
  assert.equal(typeof host.apply, 'function')
})

test('client half registers the button against the conversation input slot', () => {
  const text = readFileSync(path.join(root, 'lib/client.js'), 'utf8')
  assert.match(text, /__ModuleLoader__\.load/)
  assert.match(text, /conversation\.input\.left/)
  assert.match(text, /\/api\/prompt-optimizer/)
})

test('client half reads the draft via the 0.1.2 session-kit hook with legacy fallback', () => {
  const text = readFileSync(path.join(root, 'lib/client.js'), 'utf8')
  assert.match(text, /props\.useInput/, 'must consume the useInput selector hook (>=0.1.2 slot standard kit)')
  assert.match(text, /selectDraft\(props\.input\)/, 'must keep the pre-0.1.2 props.input fallback')
})
