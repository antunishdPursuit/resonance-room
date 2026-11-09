import assert from 'node:assert/strict'
import test from 'node:test'
import { canStartChatExchange, MAX_CHAT_MESSAGES } from '../src/chat/chatSession.js'
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
