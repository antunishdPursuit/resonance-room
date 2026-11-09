import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync, realpathSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as prettier from 'prettier'
import { changedFiles, selectFiles } from '../quality.mjs'

const web = fileURLToPath(new URL('../', import.meta.url))

test('format selection excludes generated files, assets and the lockfile', () => {
  const files = [
    'web/src/example.jsx',
    'web/tests/example.mjs',
    'web/public/vendor.js',
    'web/dist/app.js',
    'web/node_modules/tool.js',
    'web/coverage/report.html',
    'web/package-lock.json',
    'backend/main.py',
    'tests/test_api.py',
  ]
  assert.deepEqual(selectFiles(files, 'web'), files.slice(0, 2))
  assert.deepEqual(selectFiles(files, 'python'), files.slice(-2))
})

test('format selection handles divergent bases, commits, staged, unstaged and new files', () => {
  const parent = realpathSync(os.tmpdir())
  const directory = realpathSync(mkdtempSync(path.join(parent, 'resonance-quality-')))
  function git(...args) {
    const result = spawnSync('git', args, { cwd: directory, encoding: 'utf8' })
    assert.equal(result.status, 0, result.stderr)
    return result.stdout.trim()
  }
  try {
    git('init', '-b', 'main')
    git('config', 'user.name', 'Quality Fixture')
    git('config', 'user.email', 'quality@example.invalid')
    writeFileSync(path.join(directory, 'first.js'), 'initial\n')
    writeFileSync(path.join(directory, 'removed.js'), 'initial\n')
    writeFileSync(path.join(directory, 'main-only.js'), 'initial\n')
    writeFileSync(path.join(directory, 'unstaged.js'), 'initial\n')
    git('add', 'first.js', 'removed.js', 'main-only.js', 'unstaged.js')
    git('commit', '-m', 'test: seed quality fixture')
    const base = git('rev-parse', 'HEAD')
    git('checkout', '-b', 'feature')
    writeFileSync(path.join(directory, 'first.js'), 'committed\n')
    git('add', 'first.js')
    git('commit', '-m', 'test: first changed commit')
    writeFileSync(path.join(directory, 'second.js'), 'second commit\n')
    git('add', 'second.js')
    git('commit', '-m', 'test: second changed commit')
    git('checkout', 'main')
    writeFileSync(path.join(directory, 'main-only.js'), 'changed only on main\n')
    git('add', 'main-only.js')
    git('commit', '-m', 'test: advance comparison branch')
    git('checkout', 'feature')
    writeFileSync(path.join(directory, 'unstaged.js'), 'unstaged\n')
    writeFileSync(path.join(directory, 'staged.js'), 'staged\n')
    git('add', 'staged.js')
    writeFileSync(path.join(directory, 'new.js'), 'new\n')
    git('rm', 'removed.js')
    const expected = ['first.js', 'new.js', 'second.js', 'staged.js', 'unstaged.js']
    assert.deepEqual(changedFiles(base, directory).sort(), expected)
    assert.deepEqual(changedFiles('main', directory).sort(), expected)
    assert.throws(() => changedFiles('missing-baseline', directory), /Cannot determine/)
  } finally {
    assert.equal(path.dirname(directory), parent)
    assert.ok(path.basename(directory).startsWith('resonance-quality-'))
    rmSync(directory, { recursive: true, force: true })
  }
})

test('ESLint rejects undefined values and conditional hooks, and understands JSX references', () => {
  for (const [source, passes] of [
    ['console.log(undefinedQualityValue)', false],
    [
      "import { useState } from 'react'; export function Bad({ flag }) { if (flag) useState(0); return null }",
      false,
    ],
    ['function Child() { return <div /> } export function Parent() { return <Child /> }', true],
  ]) {
    const result = spawnSync(
      process.execPath,
      ['node_modules/eslint/bin/eslint.js', '--stdin', '--stdin-filename', 'src/quality-probe.jsx'],
      { cwd: web, input: source, encoding: 'utf8' },
    )
    assert.equal(result.status === 0, passes, result.stdout + result.stderr)
  }
})

test('Prettier detects and corrects nonconforming source', async () => {
  const options = await prettier.resolveConfig(path.join(web, 'src/example.js'))
  const source = 'const value={a:1};\n'
  assert.equal(await prettier.check(source, { ...options, parser: 'babel' }), false)
  const formatted = await prettier.format(source, { ...options, parser: 'babel' })
  assert.equal(await prettier.check(formatted, { ...options, parser: 'babel' }), true)
})
