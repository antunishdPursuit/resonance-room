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
    first.slice(0, 2).map((song) => song.title),
    ['Gym Hero', 'Bright Sprint'],
  )
  assert.equal(new Set(first.map((song) => song.artist)).size, first.length)
})

test('matches the approved guided recommendation profiles', () => {
  const chill = createFallbackChatReply('I need calm lofi music to relax')
  const surprise = createFallbackChatReply('Surprise me')
  const focus = createFallbackChatReply('focus')

  assert.match(chill.response, /chill study vibes/)
  assert.deepEqual(
    chill.recommendations.slice(0, 2).map((song) => song.title),
    ['Small Hours', 'Library Rain'],
  )
  assert.match(surprise.response, /Here are some tracks I think you'll enjoy!/)
  assert.equal(surprise.recommendations[0].title, 'Corner Table')
  assert.match(focus.response, /focus/)
  assert.deepEqual(
    focus.recommendations.slice(0, 2).map((song) => song.title),
    ['Deep Work', 'Notebook Daydream'],
  )
})

test('preserves scoring and profile rankings when given the original catalog', () => {
  const original = SONG_CATALOG.slice(0, 36)
  for (const [request, expected] of [
    ['chill', ['Library Rain', 'Midnight Coding']],
    ['focus', ['Deep Work', 'Notebook Daydream']],
    ['energy', ['Gym Hero', 'Fast Forward']],
    ['surprise me', ['Coffee Shop Stories', 'Blue Hour Letters']],
  ]) {
    assert.deepEqual(
      recommendFallbackSongs(request, original)
        .slice(0, 2)
        .map((song) => song.title),
      expected,
    )
  }
})

test('preserves the guided choices and static catalog boundary', () => {
  assert.deepEqual(
    GUIDED_VIBES.map((vibe) => vibe.label),
    ['Chill', 'Focus', 'Energy', 'Feel-good', 'Moody', 'Surprise me'],
  )
  assert.equal(SONG_CATALOG.length, 100)
  assert.equal(SONG_CATALOG[0].title, 'Sunrise City')
  assert.equal(SONG_CATALOG[35].title, 'Last Train Home')
})

test('avoids songs from the previous set while alternatives remain', () => {
  const first = recommendFallbackSongs('chill')
  const second = recommendFallbackSongs('chill', SONG_CATALOG, {
    excludeSongs: first,
  })
  const firstTitles = new Set(first.map((song) => song.title))

  assert.equal(second.length, 6)
  assert.equal(
    second.some((song) => firstTitles.has(song.title)),
    false,
  )
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
