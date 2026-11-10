import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canStartChatExchange,
  createChatExchangeGuard,
  MAX_CHAT_MESSAGES,
} from '../src/chat/chatSession.js'
import { createChatClient } from '../src/chat/chatClient.js'
import { createAppConfig } from '../src/config/appConfig.js'
import { deriveTasteProfile } from '../src/recommendations/tasteProfile.js'

test('the conversation limit reserves a complete request/reply pair at either parity', () => {
  assert.equal(canStartChatExchange(0), true)
  assert.equal(canStartChatExchange(MAX_CHAT_MESSAGES - 2), true)
  assert.equal(canStartChatExchange(MAX_CHAT_MESSAGES - 1), false)
  assert.equal(canStartChatExchange(MAX_CHAT_MESSAGES), false)
})

test('five static likes and nine exchanges expose reset before a request would be silently refused', async () => {
  const request = createChatClient({
    appConfig: createAppConfig(),
    fetchImpl: () => assert.fail('Static recommendations must not contact a provider'),
  })
  let messages = []
  for (let exchange = 0; exchange < 9; exchange++) {
    assert.equal(canStartChatExchange(messages.length), true)
    messages.push({ role: 'user', content: 'Chill' })
    const reply = await request(messages)
    messages.push({ role: 'assistant', content: reply.response, songs: reply.recommendations })
    if (exchange === 0) {
      const taste = deriveTasteProfile(reply.recommendations.slice(0, 5))
      assert.ok(taste)
      messages.push({ role: 'assistant', content: taste.summary, kind: 'profile' })
    }
  }
  assert.equal(messages.length, 19)
  assert.equal(canStartChatExchange(messages.length), false)
  messages = []
  assert.equal(canStartChatExchange(messages.length), true)
  const restarted = await request([{ role: 'user', content: 'Focus' }])
  assert.equal(restarted.recommendations.length, 6)
})

test('a pending exchange reserves history until its reply or failure completes', async () => {
  const guard = createChatExchangeGuard()
  let release
  const pending = new Promise((resolve) => {
    release = resolve
  })
  let messageCount = 2
  assert.equal(guard.tryStart(messageCount), true)
  const work = (async () => {
    try {
      await pending
      messageCount += 2
    } finally {
      guard.finish()
    }
  })()
  // A fifth-like request must defer rather than reuse the outstanding snapshot.
  assert.equal(guard.isBusy(), true)
  assert.equal(guard.tryStart(messageCount), false)
  release()
  await work
  assert.equal(messageCount, 4)
  assert.equal(guard.tryStart(messageCount), true)
  guard.finish()
  assert.equal(guard.tryStart(20), false)
  assert.equal(guard.isBusy(), false)
})
