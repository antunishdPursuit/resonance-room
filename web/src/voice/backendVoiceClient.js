export function createBackendVoiceClient({
  appConfig,
  fetchImpl = globalThis.fetch,
}) {
  if (!appConfig) {
    throw new Error('Voice client requires an application configuration.')
  }

  async function checkAvailability() {
    if (!appConfig.usesBackend) return false

    try {
      const response = await fetchImpl(`${appConfig.apiBaseUrl}/tts/available`)
      if (!response.ok) return false

      const data = await response.json()
      return data?.elevenlabs === true
    } catch {
      return false
    }
  }

  async function synthesize(text) {
    if (!appConfig.usesBackend || typeof text !== 'string' || !text.trim()) {
      return null
    }

    try {
      const response = await fetchImpl(`${appConfig.apiBaseUrl}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      return response.ok ? response.blob() : null
    } catch {
      return null
    }
  }

  return Object.freeze({
    checkAvailability,
    synthesize,
  })
}
