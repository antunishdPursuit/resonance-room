const GOOGLE_VOICE_ORDER = Object.freeze([
  'Google US English',
  'Karen',
  'Moira',
])

const LOCAL_VOICE_ORDER = Object.freeze([
  'Karen',
  'Samantha',
])

function isEnglishVoice(voice) {
  return typeof voice?.lang === 'string'
    && voice.lang.toLowerCase().startsWith('en')
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
