import assert from 'node:assert/strict'
import test from 'node:test'

import { createChatClient } from '../src/chat/chatClient.js'
import { createAppConfig } from '../src/config/appConfig.js'

const MESSAGES = [
  {
    role: 'assistant',
    content: 'What would you like to hear?',
    songs: [{ title: 'UI-only metadata' }],
  },
  { role: 'user', content: 'Give me energetic pop music' },
]
const API_MESSAGES = MESSAGES.map(({ role, content }) => ({ role, content }))

test('uses the local recommender without fetching in static mode', async () => {
  let fetchCalled = false
  const requestReply = createChatClient({
    appConfig: createAppConfig(),
    fetchImpl: async () => {
      fetchCalled = true
      throw new Error('Static mode must not fetch.')
    },
  })

  const reply = await requestReply(MESSAGES)

  assert.equal(fetchCalled, false)
  assert.equal(reply.recommendations.length, 6)
  assert.equal(reply.recommendations[0].title, 'Gym Hero')
})

test('passes earlier static recommendations to the fallback as exclusions', async () => {
  const calls = []
  const requestReply = createChatClient({
    appConfig: createAppConfig(),
    fallbackReply: async (message, options) => {
      calls.push({ message, options })
      return { response: 'Try these.', recommendations: [] }
    },
  })
  const priorSong = { title: 'Earlier Song', artist: 'Earlier Artist' }

  await requestReply([
    { role: 'assistant', content: 'Try this.', songs: [priorSong] },
    { role: 'user', content: 'chill' },
  ])

  assert.deepEqual(calls, [{
    message: 'chill',
    options: {
      excludeSongs: [priorSong],
      repeatCount: 1,
      tasteProfile: null,
    },
  }])
})

test('passes repeat and taste context to the static fallback', async () => {
  const calls = []
  const requestReply = createChatClient({
    appConfig: createAppConfig(),
    fallbackReply: async (message, options) => {
      calls.push({ message, options })
      return { response: 'Try these.', recommendations: [] }
    },
  })
  const tasteProfile = { genre: 'lofi' }

  await requestReply([
    { role: 'user', content: 'Chill' },
    { role: 'assistant', content: 'Try these.', songs: [] },
    { role: 'user', content: 'Chill' },
  ], { tasteProfile })

  assert.equal(calls[0].options.repeatCount, 2)
  assert.equal(calls[0].options.tasteProfile, tasteProfile)
})

test('sends the bounded conversation to FastAPI in backend mode', async () => {
  const requests = []
  const requestReply = createChatClient({
    appConfig: createAppConfig({
      mode: 'backend',
      apiBaseUrl: 'http://127.0.0.1:8001',
    }),
    fetchImpl: async (url, options) => {
      requests.push({ url, options })
      return {
        ok: true,
        async json() {
          return {
            response: 'Try these songs.',
            recommendations: [{ title: 'Song', artist: 'Artist', url: '' }],
          }
        },
      }
    },
  })

  const reply = await requestReply(MESSAGES)

  assert.deepEqual(reply, {
    response: 'Try these songs.',
    recommendations: [{ title: 'Song', artist: 'Artist', url: '' }],
  })
  assert.equal(requests.length, 1)
  assert.equal(requests[0].url, 'http://127.0.0.1:8001/chat')
  assert.equal(requests[0].options.method, 'POST')
  assert.deepEqual(
    JSON.parse(requests[0].options.body),
    { messages: API_MESSAGES },
  )
})

test('reports backend response failures', async () => {
  const requestReply = createChatClient({
    appConfig: createAppConfig({ mode: 'backend' }),
    fetchImpl: async () => ({ ok: false, status: 502 }),
  })

  await assert.rejects(
    requestReply(MESSAGES),
    /Chat request failed with status 502/,
  )
})

test('rejects malformed backend replies', async () => {
  const requestReply = createChatClient({
    appConfig: createAppConfig({ mode: 'backend' }),
    fetchImpl: async () => ({
      ok: true,
      async json() {
        return { recommendations: [] }
      },
    }),
  })

  await assert.rejects(
    requestReply(MESSAGES),
    /did not include a reply/,
  )
})

test('requires a non-empty user message in either mode', async () => {
  const requestReply = createChatClient({
    appConfig: createAppConfig(),
  })

  await assert.rejects(
    requestReply([{ role: 'assistant', content: 'Hello' }]),
    /non-empty user message/,
  )
})
