export const APP_MODE_STATIC = 'static'
export const APP_MODE_BACKEND = 'backend'

const DEFAULT_BACKEND_URL = 'http://localhost:8001'

export function resolveAppMode(value) {
  const mode = String(value ?? '').trim().toLowerCase()
  if (!mode) return APP_MODE_STATIC

  if (mode !== APP_MODE_STATIC && mode !== APP_MODE_BACKEND) {
    throw new Error(
      `Unsupported VITE_APP_MODE "${value}". Use "static" or "backend".`,
    )
  }

  return mode
}

function normalizeBackendUrl(value) {
  const rawUrl = String(value ?? '').trim() || DEFAULT_BACKEND_URL
  const url = new URL(rawUrl)

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('VITE_API_BASE_URL must use http or https.')
  }

  return url.href.replace(/\/$/, '')
}

export function createAppConfig({
  mode,
  apiBaseUrl,
} = {}) {
  const resolvedMode = resolveAppMode(mode)
  const usesBackend = resolvedMode === APP_MODE_BACKEND

  return Object.freeze({
    mode: resolvedMode,
    usesBackend,
    apiBaseUrl: usesBackend ? normalizeBackendUrl(apiBaseUrl) : null,
  })
}
