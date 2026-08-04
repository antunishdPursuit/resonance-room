import { SONG_CATALOG } from './songCatalog.js'

const TEMPO_RANGE = 110
const RECOMMENDATION_COUNT = 6

export const GUIDED_VIBES = [
  { id: 'chill', label: 'Chill', request: 'chill' },
  { id: 'focus', label: 'Focus', request: 'focus' },
  { id: 'energy', label: 'Energy', request: 'energy' },
  { id: 'feel-good', label: 'Feel-good', request: 'feel-good' },
  { id: 'moody', label: 'Moody', request: 'moody' },
  { id: 'surprise', label: 'Surprise me', request: 'surprise me' },
]

const PROFILES = {
  average: {
    name: 'The Average User (all targets at midpoint)',
    favoriteGenre: 'jazz',
    favoriteMood: 'relaxed',
    targetEnergy: 0.5,
    targetValence: 0.5,
    targetTempo: 100,
    targetDanceability: 0.5,
    targetAcousticness: 0.5,
  },
  chill: {
    name: 'Chill Lofi Student',
    favoriteGenre: 'lofi',
    favoriteMood: 'chill',
    targetEnergy: 0.38,
    targetValence: 0.6,
    targetTempo: 76,
    targetDanceability: 0.58,
    targetAcousticness: 0.78,
  },
  focus: {
    name: 'Focused Work',
    favoriteGenre: 'lofi',
    favoriteMood: 'focused',
    targetEnergy: 0.36,
    targetValence: 0.56,
    targetTempo: 78,
    targetDanceability: 0.56,
    targetAcousticness: 0.82,
  },
  energetic: {
    name: 'High-Energy Pop Fan',
    favoriteGenre: 'pop',
    favoriteMood: 'intense',
    targetEnergy: 0.92,
    targetValence: 0.8,
    targetTempo: 130,
    targetDanceability: 0.9,
    targetAcousticness: 0.05,
  },
  feelGood: {
    name: 'Feel-good Lift',
    favoriteGenre: 'indie pop',
    favoriteMood: 'uplifting',
    targetEnergy: 0.76,
    targetValence: 0.9,
    targetTempo: 120,
    targetDanceability: 0.84,
    targetAcousticness: 0.25,
  },
  moody: {
    name: 'Moody Night',
    favoriteGenre: 'synthwave',
    favoriteMood: 'moody',
    targetEnergy: 0.58,
    targetValence: 0.38,
    targetTempo: 98,
    targetDanceability: 0.66,
    targetAcousticness: 0.42,
  },
  rock: {
    name: 'Deep Intense Rock',
    favoriteGenre: 'rock',
    favoriteMood: 'intense',
    targetEnergy: 0.9,
    targetValence: 0.35,
    targetTempo: 150,
    targetDanceability: 0.6,
    targetAcousticness: 0.1,
  },
  emotional: {
    name: 'Conflicted (high energy + melancholic mood)',
    favoriteGenre: 'metal',
    favoriteMood: 'angry',
    targetEnergy: 0.95,
    targetValence: 0.15,
    targetTempo: 160,
    targetDanceability: 0.55,
    targetAcousticness: 0.05,
  },
}

const KEYWORD_PROFILES = [
  { keywords: new Set(['focus', 'study', 'coding', 'work']), profile: PROFILES.focus },
  { keywords: new Set(['lofi', 'chill', 'calm', 'relax', 'soft', 'lo-fi']), profile: PROFILES.chill },
  { keywords: new Set(['feel-good', 'uplifting', 'positive', 'cheerful']), profile: PROFILES.feelGood },
  { keywords: new Set(['energy', 'energetic', 'workout', 'gym', 'upbeat']), profile: PROFILES.energetic },
  { keywords: new Set(['moody', 'night', 'brooding']), profile: PROFILES.moody },
  { keywords: new Set(['pop', 'dance', 'happy']), profile: PROFILES.energetic },
  { keywords: new Set(['rock', 'metal', 'intense', 'heavy', 'dark', 'angry', 'loud', 'hard']), profile: PROFILES.rock },
  { keywords: new Set(['sad', 'melancholy', 'emotional', 'heartbreak', 'depressed']), profile: PROFILES.emotional },
]

const PROFILE_INTROS = {
  'Chill Lofi Student': "I can feel those chill study vibes! Here are some mellow tracks I think you'll love.",
  'Focused Work': 'Here are some steady tracks to help you settle in and focus.',
  'High-Energy Pop Fan': 'You want to move! Here are some high-energy tracks to keep the momentum going.',
  'Feel-good Lift': 'Let’s brighten the room with something warm and upbeat.',
  'Moody Night': 'Here are some late-night tracks with a little more shadow.',
  'Deep Intense Rock': 'Time to turn it up! Here are some intense tracks that should hit the spot.',
  'Conflicted (high energy + melancholic mood)': "Here are some tracks with that raw, emotional intensity you're after.",
}

function profileForMessage(message) {
  const words = new Set(message.toLowerCase().split(/[^a-z0-9-]+/))

  for (const { keywords, profile } of KEYWORD_PROFILES) {
    if ([...words].some(word => keywords.has(word))) return profile
  }

  return PROFILES.average
}

function songKey(song) {
  return `${song.title ?? ''}\u0000${song.artist ?? ''}`.toLowerCase()
}

function scoreSong(profile, song) {
  let score = 0
  if (song.genre === profile.favoriteGenre) score += 2
  if (song.mood === profile.favoriteMood) score += 1

  score += 2 * (1 - Math.abs(song.energy - profile.targetEnergy))
  score += 1.5 * (1 - Math.abs(song.acousticness - profile.targetAcousticness))
  score += 1 - Math.abs(song.valence - profile.targetValence)
  score += Math.max(0, 1 - Math.abs(song.tempoBpm - profile.targetTempo) / TEMPO_RANGE)
  score += 0.5 * (1 - Math.abs(song.danceability - profile.targetDanceability))
  return score
}

export function recommendFallbackSongs(message, catalog = SONG_CATALOG, {
  excludeSongs = [],
} = {}) {
  const profile = profileForMessage(message)
  const ranked = catalog
    .map((song, index) => ({ song, index, score: scoreSong(profile, song) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
  const excludedKeys = new Set(excludeSongs.map(songKey))
  const freshRanked = ranked.filter(({ song }) => !excludedKeys.has(songKey(song)))
  const repeatedRanked = ranked.filter(({ song }) => excludedKeys.has(songKey(song)))
  const candidateRanking = freshRanked.length >= RECOMMENDATION_COUNT
    ? freshRanked
    : [...freshRanked, ...repeatedRanked]

  const useArtistDiversity = new Set(catalog.map(song => song.artist)).size >= RECOMMENDATION_COUNT
  const seenArtists = new Set()
  const recommendations = []

  for (const { song } of candidateRanking) {
    if (useArtistDiversity && seenArtists.has(song.artist)) continue
    recommendations.push({
      title: song.title,
      artist: song.artist,
      url: '',
      genre: song.genre,
      mood: song.mood,
      energy: song.energy,
      danceability: song.danceability,
      acousticness: song.acousticness,
    })
    seenArtists.add(song.artist)
    if (recommendations.length === RECOMMENDATION_COUNT) break
  }

  return recommendations
}

export function createFallbackChatReply(message, options) {
  const profile = profileForMessage(message)
  const recommendations = recommendFallbackSongs(message, SONG_CATALOG, options)
  const intro = PROFILE_INTROS[profile.name] ?? "Here are some tracks I think you'll enjoy!"
  const startingTitles = recommendations
    .slice(0, 2)
    .map(song => `"${song.title}"`)
    .join(' and ')

  return {
    response: `${intro} I'd start with ${startingTitles}.`,
    recommendations,
  }
}
