import assert from 'node:assert/strict'
import test from 'node:test'

import { createChatClient, SessionSongLimitError } from '../src/chat/chatClient.js'
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

test('explicit five-like summary intent survives an empty backend recommendation list', async () => {
  let sent
  const summary = 'Your picks suggest expressive vocals. No new matches were found.'
  const likedSongs = Array.from({ length: 5 }, (_, i) => ({
    title: `Like ${i}`,
    artist: `Artist ${i}`,
  }))
  const requestReply = createChatClient({
    appConfig: createAppConfig({ mode: 'backend' }),
    fetchImpl: async (_url, options) => {
      sent = JSON.parse(options.body)
      return { ok: true, json: async () => ({ response: summary, recommendations: [] }) }
    },
  })
  const reply = await requestReply(MESSAGES, { likedSongs, tasteSummary: true })
  assert.equal(sent.taste_summary, true)
  assert.deepEqual(sent.liked_songs, likedSongs)
  assert.equal(reply.response, summary)
  assert.deepEqual(reply.recommendations, [])
})

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

test('passes recommendation history and taste context to the static fallback', async () => {
  const calls = []
  const requestReply = createChatClient({
    appConfig: createAppConfig(),
    fallbackReply: async (message, options) => {
      calls.push({ message, options })
      return { response: 'Try these.', recommendations: [] }
    },
  })
  const priorSong = { title: 'Earlier Song', artist: 'Earlier Artist' }
  const tasteProfile = { genre: 'lofi' }

  await requestReply(
    [
      { role: 'assistant', content: 'Try this.', songs: [priorSong] },
      { role: 'user', content: 'Chill' },
      { role: 'assistant', content: 'Try these.', songs: [] },
      { role: 'user', content: 'Chill' },
    ],
    { tasteProfile },
  )

  assert.deepEqual(calls, [
    {
      message: 'Chill',
      options: {
        excludeSongs: [priorSong],
        repeatCount: 2,
        tasteProfile,
      },
    },
  ])
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
  assert.deepEqual(JSON.parse(requests[0].options.body), {
    messages: API_MESSAGES,
    seen_songs: [],
    liked_songs: [],
  })
})

test('backend sends seen and liked identities separately from the model conversation', async () => {
  const bodies = []
  const requestReply = createChatClient({
    appConfig: createAppConfig({ mode: 'backend' }),
    fetchImpl: async (_url, options) => {
      bodies.push(JSON.parse(options.body))
      return { ok: true, json: async () => ({ response: 'New tracks.', recommendations: [] }) }
    },
  })
  const seen = { title: ' Seen ', artist: ' Artist ', url: 'https://example.com' }
  const liked = { title: 'Liked', artist: 'Another', secretMetadata: 'never sent' }
  await requestReply(
    [
      { role: 'assistant', content: 'Earlier.', songs: [seen, seen, { title: 'Incomplete' }] },
      { role: 'user', content: 'More music' },
    ],
    { likedSongs: [liked] },
  )
  assert.deepEqual(bodies[0].seen_songs, [{ title: 'Seen', artist: 'Artist' }])
  assert.deepEqual(bodies[0].liked_songs, [{ title: 'Liked', artist: 'Another' }])
  assert.deepEqual(bodies[0].messages, [
    { role: 'assistant', content: 'Earlier.' },
    { role: 'user', content: 'More music' },
  ])
  // New chat clears display history but preserves the current liked list.
  await requestReply([{ role: 'user', content: 'Music again' }], { likedSongs: [liked] })
  assert.deepEqual(bodies[1].seen_songs, [])
  assert.deepEqual(bodies[1].liked_songs, bodies[0].liked_songs)
  const unicodeSong = { title: '🎵'.repeat(512), artist: 'Artist' }
  await requestReply([{ role: 'user', content: 'Music' }], { likedSongs: [unicodeSong] })
  assert.deepEqual(bodies[2].liked_songs, [unicodeSong])
})

test('retained-like overflow explains recovery and removing a like restores requests', async () => {
  let requests = 0
  const requestReply = createChatClient({
    appConfig: createAppConfig({ mode: 'backend' }),
    fetchImpl: async () => {
      requests++
      return { ok: true, json: async () => ({ response: 'Ready.', recommendations: [] }) }
    },
  })
  const likedSongs = Array.from({ length: 121 }, (_, i) => ({
    title: `Song ${i}`,
    artist: 'Artist',
  }))
  await assert.rejects(
    requestReply([{ role: 'user', content: 'Music' }], { likedSongs }),
    (error) => {
      assert.ok(error instanceof SessionSongLimitError)
      assert.match(error.message, /remove some liked songs/)
      return true
    },
  )
  assert.equal(requests, 0)
  await requestReply([{ role: 'user', content: 'Music' }], { likedSongs: likedSongs.slice(1) })
  assert.equal(requests, 1)
})

test('rejects failed or malformed backend replies', async () => {
  const failedRequest = createChatClient({
    appConfig: createAppConfig({ mode: 'backend' }),
    fetchImpl: async () => ({ ok: false, status: 502 }),
  })

  await assert.rejects(failedRequest(MESSAGES), /Chat request failed with status 502/)
  const malformedRequest = createChatClient({
    appConfig: createAppConfig({ mode: 'backend' }),
    fetchImpl: async () => ({
      ok: true,
      async json() {
        return { recommendations: [] }
      },
    }),
  })

  await assert.rejects(malformedRequest(MESSAGES), /did not include a reply/)
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
