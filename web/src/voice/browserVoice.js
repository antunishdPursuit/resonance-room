const GOOGLE_VOICE_ORDER = Object.freeze([
  'Google US English',
  'Karen',
  'Moira',
])

const LOCAL_VOICE_ORDER = Object.freeze([
  'Karen',
  'Samantha',
])

const VOICE_LOAD_TIMEOUT_MS = 1000

function isEnglishVoice(voice) {
  return typeof voice?.lang === 'string'
    && voice.lang.toLowerCase().startsWith('en')
}

export function loadBrowserVoices(
  speechSynthesis,
  timeoutMs = VOICE_LOAD_TIMEOUT_MS,
) {
  const readVoices = () => Array.from(speechSynthesis?.getVoices?.() ?? [])
  const availableVoices = readVoices()

  if (availableVoices.length > 0 || !speechSynthesis?.addEventListener) {
    return Promise.resolve(availableVoices)
  }

  return new Promise(resolve => {
    let settled = false
    let timeoutId

    const finish = () => {
      if (settled) return
      settled = true
      clearTimeout(timeoutId)
      speechSynthesis.removeEventListener?.('voiceschanged', handleVoicesChanged)
      resolve(readVoices())
    }

    const handleVoicesChanged = () => finish()
    timeoutId = setTimeout(finish, timeoutMs)

    speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged)

    if (readVoices().length > 0) finish()
  })
}

export function selectPreferredBrowserVoice(voices = []) {
  const availableVoices = Array.from(voices)
  const hasGoogleUsEnglish = availableVoices.some(
    voice => voice.name === GOOGLE_VOICE_ORDER[0],
  )
  const preferredNames = hasGoogleUsEnglish
    ? GOOGLE_VOICE_ORDER
    : LOCAL_VOICE_ORDER

  for (const name of preferredNames) {
    const voice = availableVoices.find(candidate => (
      candidate.name === name && isEnglishVoice(candidate)
    ))
    if (voice) return voice
  }

  return availableVoices.find(
    voice => voice.lang?.toLowerCase() === 'en-us',
  ) ?? availableVoices.find(isEnglishVoice) ?? null
}
