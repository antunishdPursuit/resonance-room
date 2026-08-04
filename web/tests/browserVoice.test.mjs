import assert from 'node:assert/strict'
import test from 'node:test'

import {
  loadBrowserVoices,
  selectPreferredBrowserVoice,
} from '../src/voice/browserVoice.js'

function voice(name, lang = 'en-US') {
  return { name, lang }
}

test('uses the approved Google voice order', () => {
  const voices = [
    voice('Moira', 'en-IE'),
    voice('Karen', 'en-AU'),
    voice('Google US English'),
  ]

  assert.equal(selectPreferredBrowserVoice(voices)?.name, 'Google US English')
  assert.equal(
    selectPreferredBrowserVoice([
      voice('Moira', 'en-IE'),
      voice('Google US English', 'fr-FR'),
      voice('Karen', 'en-AU'),
    ])?.name,
    'Karen',
  )
})

test('uses the approved local voice order without Google US English', () => {
  const voices = [
    voice('Samantha'),
    voice('Karen', 'en-AU'),
  ]

  assert.equal(selectPreferredBrowserVoice(voices)?.name, 'Karen')
  assert.equal(
    selectPreferredBrowserVoice([
      voice('Samantha'),
      voice('Moira', 'en-IE'),
    ])?.name,
    'Samantha',
  )
})

test('falls back to US English, then any English voice, then browser default', () => {
  assert.equal(
    selectPreferredBrowserVoice([
      voice('French', 'fr-FR'),
      voice('British', 'en-GB'),
      voice('Windows', 'en-US'),
    ])?.name,
    'Windows',
  )
  assert.equal(
    selectPreferredBrowserVoice([
      voice('French', 'fr-FR'),
      voice('British', 'en-GB'),
    ])?.name,
    'British',
  )
  assert.equal(selectPreferredBrowserVoice([]), null)
})

test('loads browser voices immediately or when the browser signals readiness', async () => {
  const karen = voice('Karen', 'en-AU')
  const immediateSynthesis = {
    getVoices: () => [karen],
  }

  assert.deepEqual(await loadBrowserVoices(immediateSynthesis), [karen])

  let availableVoices = []
  let voicesChanged
  let removedListener = false
  const delayedSynthesis = {
    getVoices: () => availableVoices,
    addEventListener: (eventName, listener) => {
      assert.equal(eventName, 'voiceschanged')
      voicesChanged = listener
    },
    removeEventListener: (eventName, listener) => {
      assert.equal(eventName, 'voiceschanged')
      assert.equal(listener, voicesChanged)
      removedListener = true
    },
  }

  const loadingVoices = loadBrowserVoices(delayedSynthesis)
  availableVoices = [karen]
  voicesChanged()

  assert.deepEqual(await loadingVoices, [karen])
  assert.equal(removedListener, true)
})

test('continues safely when browser voices do not load in time', async () => {
  let removedListener = false
  const synthesis = {
    getVoices: () => [],
    addEventListener: () => {},
    removeEventListener: () => {
      removedListener = true
    },
  }

  assert.deepEqual(await loadBrowserVoices(synthesis, 0), [])
  assert.equal(removedListener, true)
})
