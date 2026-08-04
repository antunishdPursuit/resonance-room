const PROFILE_MINIMUM = 5

function mostCommon(values) {
  const counts = new Map()

  for (const value of values.filter(Boolean)) {
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
}

function average(values) {
  const numbers = values.filter(Number.isFinite)
  if (numbers.length === 0) return null
  return numbers.reduce((total, value) => total + value, 0) / numbers.length
}

function energyBand(value) {
  if (value === null) return null
  if (value >= 0.7) return 'high-energy'
  if (value <= 0.4) return 'calm'
  return 'balanced'
}

function listeningStyle({ danceability, acousticness }) {
  if (danceability !== null && danceability >= 0.75) return 'danceable'
  if (acousticness !== null && acousticness >= 0.65) return 'acoustic'
  return 'mixed'
}

function describeStyle(style) {
  return style === 'acoustic' ? 'an acoustic feel' : `a ${style} feel`
}

export function deriveTasteProfile(songs, {
  minimum = PROFILE_MINIMUM,
} = {}) {
  if (!Array.isArray(songs) || songs.length < minimum) return null

  const genre = mostCommon(songs.map(song => song.genre))
  const mood = mostCommon(songs.map(song => song.mood))
  const energy = energyBand(average(songs.map(song => song.energy)))
  const style = listeningStyle({
    danceability: average(songs.map(song => song.danceability)),
    acousticness: average(songs.map(song => song.acousticness)),
  })

  if (!genre && !mood && !energy) return null

  const traits = [
    genre ? `${genre} sounds` : null,
    mood ? `${mood} moods` : null,
    energy ? `${energy} energy` : null,
    style ? describeStyle(style) : null,
  ].filter(Boolean)

  return {
    genre,
    mood,
    energy,
    style,
    summary: `Your picks lean toward ${traits.join(', ')}.`,
  }
}
