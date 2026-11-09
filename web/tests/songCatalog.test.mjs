import assert from 'node:assert/strict'
import test from 'node:test'

import { SONG_CATALOG } from '../src/recommendations/songCatalog.js'
import { GUIDED_VIBES, recommendFallbackSongs } from '../src/recommendations/fallbackRecommender.js'

const newVibes = new Set(['wind-down', 'dance', 'acoustic', 'romantic'])
const coverage = {
  'wind-down': (song) =>
    song.energy <= 0.35 &&
    song.tempoBpm <= 80 &&
    song.acousticness >= 0.8 &&
    ['peaceful', 'chill', 'relaxed'].includes(song.mood),
  dance: (song) =>
    song.danceability >= 0.8 && song.energy >= 0.7 && song.tempoBpm >= 110 && song.tempoBpm <= 145,
  acoustic: (song) => song.acousticness >= 0.8 && song.energy <= 0.6,
  romantic: (song) => song.mood === 'romantic',
  chill: (song) =>
    ['chill', 'peaceful', 'relaxed', 'focused'].includes(song.mood) &&
    song.energy <= 0.5 &&
    song.acousticness >= 0.6,
  focus: (song) =>
    ['focused', 'chill', 'relaxed', 'peaceful'].includes(song.mood) &&
    song.energy >= 0.2 &&
    song.energy <= 0.5 &&
    song.acousticness >= 0.6,
  energy: (song) => song.energy >= 0.75,
  'feel-good': (song) => song.valence >= 0.75 && song.energy >= 0.5,
  moody: (song) =>
    ['moody', 'melancholic', 'nostalgic', 'angry'].includes(song.mood) && song.valence <= 0.5,
  surprise: (song) =>
    song.energy >= 0.25 && song.energy <= 0.7 && song.valence >= 0.35 && song.acousticness >= 0.35,
}

test('contains 108 complete synthetic records with unique identities and valid attributes', () => {
  assert.equal(SONG_CATALOG.length, 108)
  assert.equal(new Set(SONG_CATALOG.map((song) => song.id)).size, 108)
  assert.equal(
    new Set(SONG_CATALOG.map((song) => `${song.title}|${song.artist}`.toLowerCase())).size,
    108,
  )
  for (const song of SONG_CATALOG) {
    assert.ok(Number.isInteger(song.id) && song.id > 0)
    for (const field of ['title', 'artist', 'genre', 'mood']) {
      assert.equal(typeof song[field], 'string')
      assert.ok(song[field].trim().length > 0)
      assert.equal(song[field], song[field].trim())
    }
    for (const field of ['energy', 'valence', 'danceability', 'acousticness']) {
      assert.ok(
        Number.isFinite(song[field]) && song[field] >= 0 && song[field] <= 1,
        `${song.title}: invalid ${field}`,
      )
    }
    assert.ok(Number.isFinite(song.tempoBpm) && song.tempoBpm >= 40 && song.tempoBpm <= 220)
  }
})

for (const vibe of GUIDED_VIBES) {
  test(`${vibe.label} has broad suitable coverage and fresh recommendation batches`, () => {
    const suitable = SONG_CATALOG.filter(coverage[vibe.id])
    assert.ok(
      suitable.length >= (newVibes.has(vibe.id) ? 12 : 16),
      `${vibe.label}: only ${suitable.length} suitable candidates`,
    )
    assert.ok(new Set(suitable.map((song) => song.genre)).size >= 3)
    assert.ok(new Set(suitable.map((song) => song.artist)).size >= 12)

    const batches = newVibes.has(vibe.id) ? 2 : 3
    const history = []
    const seen = new Set()
    for (let batch = 0; batch < batches; batch += 1) {
      const selected = recommendFallbackSongs(vibe.request, SONG_CATALOG, { excludeSongs: history })
      assert.equal(selected.length, 6)
      assert.equal(new Set(selected.map((song) => song.artist)).size, 6)
      for (const song of selected) {
        const key = `${song.title}|${song.artist}`
        assert.ok(!seen.has(key), `${vibe.label}: repeated ${song.title}`)
        assert.ok(
          SONG_CATALOG.some(
            (candidate) => candidate.title === song.title && candidate.artist === song.artist,
          ),
        )
        if (batch === 0 || newVibes.has(vibe.id)) {
          const source = SONG_CATALOG.find(
            (candidate) => candidate.title === song.title && candidate.artist === song.artist,
          )
          assert.ok(coverage[vibe.id](source), `${vibe.label}: weak fit ${song.title}`)
        }
        seen.add(key)
      }
      history.push(...selected)
    }
    assert.equal(seen.size, batches * 6)
  })
}
