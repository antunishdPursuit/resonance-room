import { spawnSync } from 'node:child_process'
import { existsSync, lstatSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const root = fileURLToPath(new URL('../', import.meta.url))
const web = path.join(root, 'web')

function run(command, args, cwd = root) {
  console.log(`Checking: ${path.basename(command)} ${args.join(' ')}`)
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', shell: false })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`Required check failed (${result.status})`)
}

function git(args, cwd) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', shell: false })
  if (result.status !== 0) throw new Error(`Cannot determine changed files: ${result.stderr}`)
  return result.stdout
}

export function changedFiles(base, cwd = root) {
  // A missing base in a shallow checkout must fail, not silently check nothing.
  // An initial push or manual run without a base checks the complete tracked tree.
  const all = !base || /^0+$/.test(base)
  if (!all) git(['rev-parse', '--verify', `${base}^{commit}`], cwd)
  const ancestor = all ? null : git(['merge-base', base, 'HEAD'], cwd).trim()
  const tracked = git(
    all ? ['ls-files', '-z'] : ['diff', '--name-only', '-z', '--diff-filter=ACMR', ancestor, '--'],
    cwd,
  )
  const untracked = git(['ls-files', '--others', '--exclude-standard', '-z'], cwd)
  return [...new Set((tracked + untracked).split('\0').filter(Boolean))].filter((name) => {
    const absolute = path.resolve(cwd, name)
    const relative = path.relative(cwd, absolute)
    if (relative.startsWith('..') || path.isAbsolute(relative))
      throw new Error('File outside project')
    return existsSync(absolute) && lstatSync(absolute).isFile()
  })
}

export function selectFiles(files, kind) {
  if (kind === 'python') return files.filter((name) => /^(backend|tests)\/.*\.py$/.test(name))
  return files.filter(
    (name) =>
      name.startsWith('web/') &&
      !/^web\/(public|dist|node_modules|coverage)\//.test(name) &&
      name !== 'web/package-lock.json' &&
      /\.(?:js|jsx|mjs|json|css|html)$/.test(name),
  )
}

export function main(args = process.argv.slice(2)) {
  let scope = 'all'
  let base = process.env.QUALITY_BASE ?? 'HEAD'
  for (let index = 0; index < args.length; index += 2) {
    if (!['--scope', '--base'].includes(args[index]) || args[index + 1] === undefined) {
      throw new Error('Use --scope all|python|web|web-format and optional --base REF')
    }
    if (args[index] === '--scope') scope = args[index + 1]
    else base = args[index + 1]
  }
  if (!['all', 'python', 'web', 'web-format'].includes(scope))
    throw new Error('Unknown check scope')
  const files = changedFiles(base)
  console.log(
    `Formatting baseline: ${base || 'complete tracked tree'}; ${files.length} changed files`,
  )
  if (scope === 'all' || scope === 'python') {
    const python =
      process.env.QUALITY_PYTHON ??
      (process.platform === 'win32' ? path.join(root, '.venv/Scripts/python.exe') : 'python')
    run(python, ['-m', 'ruff', 'check', 'backend', 'tests'])
    const formatted = selectFiles(files, 'python')
    if (formatted.length) run(python, ['-m', 'ruff', 'format', '--check', '--', ...formatted])
    else console.log('Ruff format: no changed Python files')
  }
  if (scope === 'all' || scope === 'web') {
    run(process.execPath, ['node_modules/eslint/bin/eslint.js', '.', '--max-warnings', '0'], web)
  }
  if (scope !== 'python') {
    const formatted = selectFiles(files, 'web').map((name) => name.slice(4))
    if (formatted.length) {
      run(
        process.execPath,
        ['node_modules/prettier/bin/prettier.cjs', '--check', '--', ...formatted],
        web,
      )
    } else console.log('Prettier: no changed frontend files')
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main()
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
