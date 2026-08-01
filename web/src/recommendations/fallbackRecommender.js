import { SONG_CATALOG } from './songCatalog.js'

const TEMPO_RANGE = 110
const RECOMMENDATION_COUNT = 6

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
  { keywords: new Set(['lofi', 'chill', 'study', 'focus', 'calm', 'relax', 'soft', 'lo-fi']), profile: PROFILES.chill },
  { keywords: new Set(['pop', 'dance', 'energy', 'energetic', 'workout', 'gym', 'upbeat', 'happy']), profile: PROFILES.energetic },
  { keywords: new Set(['rock', 'metal', 'intense', 'heavy', 'dark', 'angry', 'loud', 'hard']), profile: PROFILES.rock },
  { keywords: new Set(['sad', 'moody', 'melancholy', 'emotional', 'heartbreak', 'depressed']), profile: PROFILES.emotional },
]

const PROFILE_INTROS = {
  'Chill Lofi Student': "I can feel those chill study vibes! Here are some mellow tracks I think you'll love.",
  'High-Energy Pop Fan': 'You want to move! Here are some high-energy tracks to keep the momentum going.',
  'Deep Intense Rock': 'Time to turn it up! Here are some intense tracks that should hit the spot.',
  'Conflicted (high energy + melancholic mood)': "Here are some tracks with that raw, emotional intensity you're after.",
}

function profileForMessage(message) {
  const words = new Set(message.toLowerCase().split(/\s+/))

  for (const { keywords, profile } of KEYWORD_PROFILES) {
    if ([...words].some(word => keywords.has(word))) return profile
  }

  return PROFILES.average
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

export function recommendFallbackSongs(message, catalog = SONG_CATALOG) {
  const profile = profileForMessage(message)
  const ranked = catalog
    .map((song, index) => ({ song, index, score: scoreSong(profile, song) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)

  const useArtistDiversity = new Set(catalog.map(song => song.artist)).size >= RECOMMENDATION_COUNT
  const seenArtists = new Set()
  const recommendations = []

  for (const { song } of ranked) {
    if (useArtistDiversity && seenArtists.has(song.artist)) continue
    recommendations.push({ title: song.title, artist: song.artist, url: '' })
    seenArtists.add(song.artist)
    if (recommendations.length === RECOMMENDATION_COUNT) break
  }

  return recommendations
}

export function createFallbackChatReply(message) {
  const profile = profileForMessage(message)
  const recommendations = recommendFallbackSongs(message)
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
