import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createFallbackChatReply,
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
    ['Gym Hero', 'Sunrise City'],
  )
})

test('matches the backend fallback profile for chill study music', () => {
  const reply = createFallbackChatReply('I need calm lofi music to study')

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

test('keeps artist diversity when the catalog can fill all six slots', () => {
  const artists = recommendFallbackSongs('pop').map(song => song.artist)

  assert.equal(new Set(artists).size, artists.length)
})

test('preserves all 18 stored songs as the static frontend source', () => {
  assert.equal(SONG_CATALOG.length, 18)
  assert.equal(SONG_CATALOG[0].title, 'Sunrise City')
  assert.equal(SONG_CATALOG.at(-1).title, 'Slow Burn Summer')
})
