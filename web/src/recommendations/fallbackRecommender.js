import { SONG_CATALOG } from './songCatalog.js'

const TEMPO_RANGE = 110
const RECOMMENDATION_COUNT = 6

export const GUIDED_VIBES = [
  { id: 'chill', label: 'Chill', request: 'chill' },
  { id: 'focus', label: 'Focus', request: 'focus' },
  { id: 'energy', label: 'Energy', request: 'energy' },
  { id: 'feel-good', label: 'Feel-good', request: 'feel-good' },
  { id: 'moody', label: 'Moody', request: 'moody' },
  { id: 'wind-down', label: 'Wind down', request: 'wind-down' },
  { id: 'dance', label: 'Dance', request: 'dance' },
  { id: 'acoustic', label: 'Acoustic', request: 'acoustic' },
  { id: 'romantic', label: 'Romantic', request: 'romantic' },
  { id: 'surprise', label: 'Surprise me', request: 'surprise me' },
]

const PROFILES = {
  windDown: {
    name: 'Wind Down',
    favoriteGenre: null,
    favoriteMood: 'peaceful',
    targetEnergy: 0.25,
    targetValence: 0.6,
    targetTempo: 68,
    targetDanceability: 0.35,
    targetAcousticness: 0.92,
    acceptsSong: (song) =>
      song.energy <= 0.35 &&
      song.tempoBpm <= 80 &&
      song.acousticness >= 0.8 &&
      ['peaceful', 'chill', 'relaxed'].includes(song.mood),
  },
  dance: {
    name: 'Dance Floor',
    favoriteGenre: null,
    favoriteMood: 'energetic',
    targetEnergy: 0.85,
    targetValence: 0.8,
    targetTempo: 126,
    targetDanceability: 0.92,
    targetAcousticness: 0.15,
    acceptsSong: (song) =>
      song.danceability >= 0.8 &&
      song.energy >= 0.7 &&
      song.tempoBpm >= 110 &&
      song.tempoBpm <= 145,
  },
  acoustic: {
    name: 'Acoustic Selection',
    favoriteGenre: null,
    favoriteMood: null,
    targetEnergy: 0.4,
    targetValence: 0.65,
    targetTempo: 86,
    targetDanceability: 0.5,
    targetAcousticness: 0.95,
    acceptsSong: (song) => song.acousticness >= 0.8 && song.energy <= 0.6,
  },
  romantic: {
    name: 'Romantic Evening',
    favoriteGenre: null,
    favoriteMood: 'romantic',
    targetEnergy: 0.55,
    targetValence: 0.77,
    targetTempo: 94,
    targetDanceability: 0.65,
    targetAcousticness: 0.6,
    acceptsSong: (song) => song.mood === 'romantic',
  },
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
  { keywords: new Set(['wind-down', 'bedtime', 'sleep']), profile: PROFILES.windDown },
  { keywords: new Set(['dance', 'dancing']), profile: PROFILES.dance },
  { keywords: new Set(['acoustic', 'unplugged']), profile: PROFILES.acoustic },
  { keywords: new Set(['romantic', 'romance']), profile: PROFILES.romantic },
  { keywords: new Set(['focus', 'study', 'coding', 'work']), profile: PROFILES.focus },
  {
    keywords: new Set(['lofi', 'chill', 'calm', 'relax', 'soft', 'lo-fi']),
    profile: PROFILES.chill,
  },
  {
    keywords: new Set(['feel-good', 'uplifting', 'positive', 'cheerful']),
    profile: PROFILES.feelGood,
  },
  {
    keywords: new Set(['energy', 'energetic', 'workout', 'gym', 'upbeat']),
    profile: PROFILES.energetic,
  },
  { keywords: new Set(['moody', 'night', 'brooding']), profile: PROFILES.moody },
  { keywords: new Set(['pop', 'happy']), profile: PROFILES.energetic },
  {
    keywords: new Set(['rock', 'metal', 'intense', 'heavy', 'dark', 'angry', 'loud', 'hard']),
    profile: PROFILES.rock,
  },
  {
    keywords: new Set(['sad', 'melancholy', 'emotional', 'heartbreak', 'depressed']),
    profile: PROFILES.emotional,
  },
]

const PROFILE_INTROS = {
  'Wind Down': [
    'Let’s slow things down with six gentle picks.',
    'Here are six more quiet picks for winding down.',
  ],
  'Dance Floor': [
    'Here are six rhythm-led picks to get you moving.',
    'Let’s keep the rhythm going with another six tracks.',
  ],
  'Acoustic Selection': [
    'Here are six picks with a more acoustic sound.',
    'Here are six more acoustic-leaning tracks to explore.',
  ],
  'Romantic Evening': [
    'Here are six warm picks for a romantic mood.',
    'Let’s stay in that romantic mood with six more tracks.',
  ],
  'Chill Lofi Student': [
    "I can feel those chill study vibes! Here are some mellow tracks I think you'll love.",
    'Staying mellow? I found a fresh set that keeps the room calm.',
    'Let’s keep it easygoing with six more quiet favorites.',
  ],
  'Focused Work': [
    'Here are some steady tracks to help you settle in and focus.',
    'Back in focus mode? I picked a different set to keep things moving.',
    'Here are six more low-distraction tracks for your next stretch.',
  ],
  'High-Energy Pop Fan': [
    'You want to move! Here are some high-energy tracks to keep the momentum going.',
    'Keeping the energy up? This set brings a different kind of momentum.',
    'I found six more bright, fast tracks for you.',
  ],
  'Feel-good Lift': [
    'Let’s brighten the room with something warm and upbeat.',
    'More feel-good music coming up, with a fresh group this time.',
    'Here are six more tracks made for a lighter mood.',
  ],
  'Moody Night': [
    'Here are some late-night tracks with a little more shadow.',
    'Let’s stay in that moody lane with a different set of songs.',
    'I found six more tracks for the quieter side of the night.',
  ],
  'Deep Intense Rock': [
    'Time to turn it up! Here are some intense tracks that should hit the spot.',
    'Still going loud? I found a new set with the same edge.',
  ],
  'Conflicted (high energy + melancholic mood)': [
    "Here are some tracks with that raw, emotional intensity you're after.",
    'I found another set that balances heavy energy with a darker mood.',
  ],
}
const DEFAULT_INTROS = [
  "Here are some tracks I think you'll enjoy!",
  'Let’s try a different corner of the catalog this time.',
  'I picked six more songs to keep the surprise going.',
]

function profileForMessage(message) {
  const words = new Set(
    message
      .toLowerCase()
      .replace(/\bwind\s+down\b/g, 'wind-down')
      .split(/[^a-z0-9-]+/),
  )

  for (const { keywords, profile } of KEYWORD_PROFILES) {
    if ([...words].some((word) => keywords.has(word))) return profile
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

export function recommendFallbackSongs(
  message,
  catalog = SONG_CATALOG,
  { excludeSongs = [] } = {},
) {
  const profile = profileForMessage(message)
  const candidates = profile.acceptsSong ? catalog.filter(profile.acceptsSong) : catalog
  const ranked = candidates
    .map((song, index) => ({ song, index, score: scoreSong(profile, song) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
  const excludedKeys = new Set(excludeSongs.map(songKey))
  const freshRanked = ranked.filter(({ song }) => !excludedKeys.has(songKey(song)))
  const repeatedRanked = ranked.filter(({ song }) => excludedKeys.has(songKey(song)))
  const candidateRanking =
    freshRanked.length >= RECOMMENDATION_COUNT ? freshRanked : [...freshRanked, ...repeatedRanked]

  const useArtistDiversity =
    new Set(candidates.map((song) => song.artist)).size >= RECOMMENDATION_COUNT
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
  const intros = PROFILE_INTROS[profile.name] ?? DEFAULT_INTROS
  const repeatCount = Number.isInteger(options?.repeatCount) ? Math.max(1, options.repeatCount) : 1
  const intro = intros[(repeatCount - 1) % intros.length]
  const tasteNote = options?.tasteProfile?.genre
    ? ` I remember your likes lean toward ${options.tasteProfile.genre}, too.`
    : ''
  const startingTitles = recommendations
    .slice(0, 2)
    .map((song) => `"${song.title}"`)
    .join(' and ')

  return {
    response: `${intro}${tasteNote} I'd start with ${startingTitles}.`,
    recommendations,
  }
}
