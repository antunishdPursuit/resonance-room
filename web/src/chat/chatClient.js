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
    .find((candidate) => candidate?.role === 'user')

  if (!message?.content?.trim()) {
    throw new Error('Chat requires a non-empty user message.')
  }

  return message.content
}

function previouslyRecommendedSongs(messages) {
  return messages.flatMap((message) =>
    message?.role === 'assistant' && Array.isArray(message.songs) ? message.songs : [],
  )
}

function matchingRequestCount(messages, userText) {
  const normalizedText = userText.trim().toLowerCase()
  return messages.filter(
    (message) =>
      message?.role === 'user' && message.content?.trim().toLowerCase() === normalizedText,
  ).length
}

export class SessionSongLimitError extends Error {
  constructor() {
    super(
      'Please remove some liked songs before requesting more recommendations. The local limit is 120 songs.',
    )
    this.name = 'SessionSongLimitError'
  }
}

function songIdentities(songs) {
  const unique = new Map()
  for (const song of songs) {
    if (typeof song?.title !== 'string' || typeof song?.artist !== 'string') continue
    const title = song.title.trim()
    const artist = song.artist.trim()
    if (!title || !artist || [...title].length > 512 || [...artist].length > 512) continue
    unique.set(JSON.stringify([title.toLowerCase(), artist.toLowerCase()]), { title, artist })
  }
  if (unique.size > 120) throw new SessionSongLimitError()
  return [...unique.values()]
}

function normalizeBackendReply(data) {
  if (!data || typeof data.response !== 'string' || !data.response.trim()) {
    throw new Error('Chat response did not include a reply.')
  }

  return {
    response: data.response,
    recommendations: Array.isArray(data.recommendations) ? data.recommendations : null,
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

  return async function requestChatReply(messages, context = {}) {
    const requestMessages = sanitizeMessages(messages)
    const userText = latestUserMessage(requestMessages)

    if (!appConfig.usesBackend) {
      return fallbackReply(userText, {
        excludeSongs: previouslyRecommendedSongs(messages),
        repeatCount: matchingRequestCount(requestMessages, userText),
        tasteProfile: context.tasteProfile ?? null,
      })
    }

    const response = await fetchImpl(`${appConfig.apiBaseUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: requestMessages,
        seen_songs: songIdentities(previouslyRecommendedSongs(messages)),
        liked_songs: songIdentities(context.likedSongs ?? []),
      }),
    })

    if (!response.ok) {
      throw new Error(`Chat request failed with status ${response.status}.`)
    }

    return normalizeBackendReply(await response.json())
  }
}
