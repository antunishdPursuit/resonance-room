import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createFallbackChatReply,
  GUIDED_VIBES,
  recommendFallbackSongs,
} from '../src/recommendations/fallbackRecommender.js'
import { SONG_CATALOG } from '../src/recommendations/songCatalog.js'

test('returns six deterministic recommendations from the frontend catalog', () => {
  const first = recommendFallbackSongs('Give me energetic pop music')
  const second = recommendFallbackSongs('Give me energetic pop music')

  assert.equal(first.length, 6)
  assert.deepEqual(second, first)
  assert.deepEqual(
    first.slice(0, 2).map(song => song.title),
    ['Gym Hero', 'Fast Forward'],
  )
})

test('matches the chill profile for calm lofi requests', () => {
  const reply = createFallbackChatReply('I need calm lofi music to relax')

  assert.match(reply.response, /chill study vibes/)
  assert.deepEqual(
    reply.recommendations.slice(0, 2).map(song => song.title),
    ['Library Rain', 'Midnight Coding'],
  )
})

test('uses the average profile when no fallback keyword matches', () => {
  const reply = createFallbackChatReply('Surprise me')

  assert.match(reply.response, /Here are some tracks I think you'll enjoy!/)
  assert.equal(reply.recommendations[0].title, 'Coffee Shop Stories')
})

test('offers six clear guided vibe choices', () => {
  assert.deepEqual(
    GUIDED_VIBES.map(vibe => vibe.label),
    ['Chill', 'Focus', 'Energy', 'Feel-good', 'Moody', 'Surprise me'],
  )
})

test('gives focus its own recommendation profile', () => {
  const reply = createFallbackChatReply('focus')

  assert.match(reply.response, /focus/)
  assert.deepEqual(
    reply.recommendations.slice(0, 2).map(song => song.title),
    ['Deep Work', 'Notebook Daydream'],
  )
})

test('avoids songs from the previous set while alternatives remain', () => {
  const first = recommendFallbackSongs('chill')
  const second = recommendFallbackSongs('chill', SONG_CATALOG, {
    excludeSongs: first,
  })
  const firstTitles = new Set(first.map(song => song.title))

  assert.equal(second.length, 6)
  assert.equal(second.some(song => firstTitles.has(song.title)), false)
})

test('varies the reply when the same vibe is selected again', () => {
  const first = createFallbackChatReply('chill', { repeatCount: 1 })
  const second = createFallbackChatReply('chill', { repeatCount: 2 })

  assert.notEqual(second.response, first.response)
  assert.match(second.response, /fresh set/)
})

test('acknowledges the session taste profile in later replies', () => {
  const reply = createFallbackChatReply('moody', {
    tasteProfile: { genre: 'lofi' },
  })

  assert.match(reply.response, /likes lean toward lofi/)
})

test('keeps artist diversity when the catalog can fill all six slots', () => {
  const artists = recommendFallbackSongs('pop').map(song => song.artist)

  assert.equal(new Set(artists).size, artists.length)
})

test('preserves all 36 stored songs as the static frontend source', () => {
  assert.equal(SONG_CATALOG.length, 36)
  assert.equal(SONG_CATALOG[0].title, 'Sunrise City')
  assert.equal(SONG_CATALOG.at(-1).title, 'Last Train Home')
})
