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

test('checks and requests ElevenLabs audio through FastAPI', async () => {
  const audioBlob = { type: 'audio/mpeg' }
  const requests = []
  const client = createBackendVoiceClient({
    appConfig: createAppConfig({
      mode: 'backend',
      apiBaseUrl: 'http://127.0.0.1:8001',
    }),
    fetchImpl: async (url, options) => {
      requests.push({ url, options })
      if (url.endsWith('/tts/available')) {
        return {
          ok: true,
          async json() {
            return { elevenlabs: true }
          },
        }
      }
      return {
        ok: true,
        async blob() {
          return audioBlob
        },
      }
    },
  })

  assert.equal(await client.checkAvailability(), true)
  assert.equal(await client.synthesize('Hello Riri'), audioBlob)
  assert.deepEqual(requests[0], {
    url: 'http://127.0.0.1:8001/tts/available',
    options: undefined,
  })
  assert.equal(requests[1].url, 'http://127.0.0.1:8001/tts')
  assert.equal(requests[1].options.method, 'POST')
  assert.deepEqual(
    JSON.parse(requests[1].options.body),
    { text: 'Hello Riri' },
  )
})

test('handles unavailable or blank backend voice requests safely', async () => {
  let fetchCalls = 0
  const client = createBackendVoiceClient({
    appConfig: createAppConfig({ mode: 'backend' }),
    fetchImpl: async () => {
      fetchCalls += 1
      return { ok: false }
    },
  })

  assert.equal(await client.checkAvailability(), false)
  assert.equal(await client.synthesize('Hello'), null)
  assert.equal(await client.synthesize('   '), null)
  assert.equal(fetchCalls, 2)
})
