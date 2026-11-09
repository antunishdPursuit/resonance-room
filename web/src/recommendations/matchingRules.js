const RELATED_MOODS = {
  focused: { chill: 0.8, relaxed: 0.7, peaceful: 0.6 },
  chill: { relaxed: 0.9, peaceful: 0.8, focused: 0.7 },
  intense: { energetic: 1, confident: 0.6, uplifting: 0.5, happy: 0.4, angry: 0.4 },
  energetic: { intense: 1, confident: 0.6, uplifting: 0.5, happy: 0.4 },
  uplifting: { happy: 0.9, confident: 0.6, romantic: 0.4 },
  moody: { melancholic: 0.9, nostalgic: 0.7, angry: 0.4 },
  relaxed: { chill: 0.9, peaceful: 0.8, focused: 0.6, romantic: 0.3 },
  peaceful: { chill: 0.8, relaxed: 0.8, focused: 0.5 },
  angry: { intense: 0.7, energetic: 0.4, melancholic: 0.3 },
  romantic: { nostalgic: 0.4, relaxed: 0.3 },
}

export function moodSimilarity(target, actual) {
  if (!target || !actual) return 0
  if (target === actual) return 1
  const score = RELATED_MOODS[target]?.[actual]
  return typeof score === 'number' ? score : 0
}
