import assert from 'node:assert/strict'
import test from 'node:test'
import { moodSimilarity } from '../src/recommendations/matchingRules.js'
import { recommendFallbackSongs } from '../src/recommendations/fallbackRecommender.js'

function track(title, genre, mood = 'energetic') {
  return {
    title,
    artist: title,
    genre,
    mood,
    energy: 0.92,
    acousticness: 0.05,
    valence: 0.8,
    tempoBpm: 130,
    danceability: 0.9,
  }
}

test('exact and related moods receive bounded credit; unknown labels receive none', () => {
  for (const [target, actual, expected] of [
    ['focused', 'focused', 1],
    ['focused', 'chill', 0.8],
    ['chill', 'relaxed', 0.9],
    ['intense', 'energetic', 1],
    ['uplifting', 'happy', 0.9],
    ['moody', 'melancholic', 0.9],
    ['relaxed', 'peaceful', 0.8],
    ['focused', 'angry', 0],
    [null, 'happy', 0],
    ['focused', 'toString', 0],
  ])
    assert.equal(moodSimilarity(target, actual), expected)
})

test('all original guided profiles are genre-neutral on otherwise identical songs', () => {
  for (const [request, formerGenre] of [
    ['Chill', 'lofi'],
    ['Focus', 'lofi'],
    ['Energy', 'pop'],
    ['Feel-good', 'indie pop'],
    ['Moody', 'synthwave'],
    ['Surprise me', 'jazz'],
  ]) {
    const songs = [track('First', 'folk'), track('Second', formerGenre)]
    assert.equal(recommendFallbackSongs(request, songs)[0].title, 'First', request)
  }
})

test('related mood outranks an unrelated label when other attributes are equal', () => {
  const songs = [track('Wrong mood', 'rock', 'melancholic'), track('Related mood', 'jazz')]
  assert.equal(recommendFallbackSongs('Energy', songs)[0].title, 'Related mood')
})

test('Acoustic remains a timbre choice without an acoustic-genre bonus', () => {
  const songs = [track('Jazz first', 'jazz'), track('Acoustic second', 'acoustic')].map((song) => ({
    ...song,
    energy: 0.4,
    acousticness: 0.95,
  }))
  assert.equal(recommendFallbackSongs('Acoustic', songs)[0].title, 'Jazz first')
})
