import assert from 'node:assert/strict'
import test from 'node:test'

import {
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
