import assert from 'node:assert/strict'
import test from 'node:test'

import {
  APP_MODE_BACKEND,
  APP_MODE_STATIC,
  createAppConfig,
  resolveAppMode,
} from '../src/config/appConfig.js'

test('uses static mode when VITE_APP_MODE is missing', () => {
  assert.equal(resolveAppMode(), APP_MODE_STATIC)
  assert.deepEqual(createAppConfig(), {
    mode: APP_MODE_STATIC,
    usesBackend: false,
    apiBaseUrl: null,
  })
})

test('normalizes explicit and default backend configuration', () => {
  assert.deepEqual(
    createAppConfig({
      mode: ' BACKEND ',
      apiBaseUrl: 'https://api.example.com/',
    }),
    {
      mode: APP_MODE_BACKEND,
      usesBackend: true,
      apiBaseUrl: 'https://api.example.com',
    },
  )
  assert.equal(
    createAppConfig({ mode: APP_MODE_BACKEND }).apiBaseUrl,
    'http://localhost:8001',
  )
})

test('rejects invalid application configuration', () => {
  assert.throws(
    () => createAppConfig({ mode: 'hybrid' }),
    /Unsupported VITE_APP_MODE/,
  )
  assert.throws(
    () => createAppConfig({
      mode: APP_MODE_BACKEND,
      apiBaseUrl: 'file:///backend',
    }),
    /must use http or https/,
  )
})
