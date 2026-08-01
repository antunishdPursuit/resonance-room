import assert from 'node:assert/strict'
import test from 'node:test'

import { createAppConfig } from '../src/config/appConfig.js'
import { createBackendVoiceClient } from '../src/voice/backendVoiceClient.js'

test('never fetches voice endpoints in static mode', async () => {
  let fetchCalls = 0
  const client = createBackendVoiceClient({
    appConfig: createAppConfig(),
    fetchImpl: async () => {
      fetchCalls += 1
      throw new Error('Static mode must not fetch.')
    },
  })

  assert.equal(await client.checkAvailability(), false)
  assert.equal(await client.synthesize('Hello'), null)
  assert.equal(fetchCalls, 0)
})

test('checks ElevenLabs availability through FastAPI in backend mode', async () => {
  const requests = []
  const client = createBackendVoiceClient({
    appConfig: createAppConfig({
      mode: 'backend',
      apiBaseUrl: 'http://127.0.0.1:8001',
    }),
    fetchImpl: async (url, options) => {
      requests.push({ url, options })
      return {
        ok: true,
        async json() {
          return { elevenlabs: true }
        },
      }
    },
  })

  assert.equal(await client.checkAvailability(), true)
  assert.deepEqual(requests, [{
    url: 'http://127.0.0.1:8001/tts/available',
    options: undefined,
  }])
})

test('returns synthesized audio from the backend voice endpoint', async () => {
  const audioBlob = { type: 'audio/mpeg' }
  const requests = []
  const client = createBackendVoiceClient({
    appConfig: createAppConfig({ mode: 'backend' }),
    fetchImpl: async (url, options) => {
      requests.push({ url, options })
      return {
        ok: true,
        async blob() {
          return audioBlob
        },
      }
    },
  })

  assert.equal(await client.synthesize('Hello Esme'), audioBlob)
  assert.equal(requests[0].url, 'http://localhost:8001/tts')
  assert.equal(requests[0].options.method, 'POST')
  assert.deepEqual(
    JSON.parse(requests[0].options.body),
    { text: 'Hello Esme' },
  )
})

test('returns false or null when backend voice requests fail', async () => {
  const client = createBackendVoiceClient({
    appConfig: createAppConfig({ mode: 'backend' }),
    fetchImpl: async () => ({ ok: false }),
  })

  assert.equal(await client.checkAvailability(), false)
  assert.equal(await client.synthesize('Hello'), null)
})

test('does not request audio for blank text', async () => {
  let fetchCalls = 0
  const client = createBackendVoiceClient({
    appConfig: createAppConfig({ mode: 'backend' }),
    fetchImpl: async () => {
      fetchCalls += 1
    },
  })

  assert.equal(await client.synthesize('   '), null)
  assert.equal(fetchCalls, 0)
})
