import assert from 'node:assert/strict'
import test from 'node:test'

import { deriveTasteProfile } from '../src/recommendations/tasteProfile.js'

const LIKED_SONGS = [
  { genre: 'lofi', mood: 'focused', energy: 0.3, danceability: 0.5, acousticness: 0.8 },
  { genre: 'lofi', mood: 'focused', energy: 0.35, danceability: 0.55, acousticness: 0.85 },
  { genre: 'ambient', mood: 'focused', energy: 0.2, danceability: 0.3, acousticness: 0.9 },
  { genre: 'lofi', mood: 'chill', energy: 0.4, danceability: 0.6, acousticness: 0.75 },
  { genre: 'jazz', mood: 'relaxed', energy: 0.37, danceability: 0.54, acousticness: 0.89 },
]

test('waits until five liked songs are available', () => {
  assert.equal(deriveTasteProfile(LIKED_SONGS.slice(0, 4)), null)
})

test('derives a deterministic profile from five liked songs', () => {
  assert.deepEqual(deriveTasteProfile(LIKED_SONGS), {
    genre: 'lofi',
    mood: 'focused',
    energy: 'calm',
    style: 'acoustic',
    summary: 'Your picks lean toward lofi sounds, focused moods, calm energy, an acoustic feel.',
  })
})

test('does not invent a profile when provider songs lack music attributes', () => {
  const songs = Array.from({ length: 5 }, (_, index) => ({
    title: `Song ${index + 1}`,
    artist: 'Unknown',
  }))

  assert.equal(deriveTasteProfile(songs), null)
})
