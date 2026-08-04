import assert from 'node:assert/strict'
import test from 'node:test'

import {
  selectPreferredBrowserVoice,
} from '../src/voice/browserVoice.js'

function voice(name, lang = 'en-US') {
  return { name, lang }
}

test('uses the approved Google voice order when Google US English is available', () => {
  const voices = [
    voice('Moira', 'en-IE'),
    voice('Karen', 'en-AU'),
    voice('Google US English'),
  ]

  assert.equal(selectPreferredBrowserVoice(voices)?.name, 'Google US English')
})

test('falls through the approved Google voice order', () => {
  const voices = [
    voice('Moira', 'en-IE'),
    voice('Google US English', 'fr-FR'),
    voice('Karen', 'en-AU'),
  ]

  assert.equal(selectPreferredBrowserVoice(voices)?.name, 'Karen')
})

test('uses the approved local voice order when Google US English is absent', () => {
  const voices = [
    voice('Samantha'),
    voice('Karen', 'en-AU'),
  ]

  assert.equal(selectPreferredBrowserVoice(voices)?.name, 'Karen')
})

test('falls back to Samantha when Karen is unavailable locally', () => {
  const voices = [
    voice('Samantha'),
    voice('Moira', 'en-IE'),
  ]

  assert.equal(selectPreferredBrowserVoice(voices)?.name, 'Samantha')
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
