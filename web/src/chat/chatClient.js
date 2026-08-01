import { createFallbackChatReply } from '../recommendations/fallbackRecommender.js'

function sanitizeMessages(messages) {
  if (!Array.isArray(messages)) {
    throw new TypeError('Chat messages must be an array.')
  }

  return messages.map((message) => {
    if (message?.role !== 'user' && message?.role !== 'assistant') {
      throw new Error('Chat messages require a supported role.')
    }
    if (typeof message.content !== 'string' || !message.content.trim()) {
      throw new Error('Chat messages require non-empty content.')
    }

    return { role: message.role, content: message.content }
  })
}

function latestUserMessage(messages) {
  const message = messages
    .slice()
    .reverse()
    .find(candidate => candidate?.role === 'user')

  if (!message?.content?.trim()) {
    throw new Error('Chat requires a non-empty user message.')
  }

  return message.content
}

function normalizeBackendReply(data) {
  if (!data || typeof data.response !== 'string' || !data.response.trim()) {
    throw new Error('Chat response did not include a reply.')
  }

  return {
    response: data.response,
    recommendations: Array.isArray(data.recommendations)
      ? data.recommendations
      : null,
  }
}

export function createChatClient({
  appConfig,
  fetchImpl = globalThis.fetch,
  fallbackReply = createFallbackChatReply,
}) {
  if (!appConfig) {
    throw new Error('Chat client requires an application configuration.')
  }

  return async function requestChatReply(messages) {
    const requestMessages = sanitizeMessages(messages)
    const userText = latestUserMessage(requestMessages)

    if (!appConfig.usesBackend) {
      return fallbackReply(userText)
    }

    const response = await fetchImpl(`${appConfig.apiBaseUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: requestMessages }),
    })

    if (!response.ok) {
      throw new Error(`Chat request failed with status ${response.status}.`)
    }

    return normalizeBackendReply(await response.json())
  }
}
