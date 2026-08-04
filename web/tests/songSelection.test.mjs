import assert from 'node:assert/strict'
import test from 'node:test'

import {
  isSongSelected,
  removeSongSelection,
  toggleSongSelection,
} from '../src/ui/songSelection.js'

test('toggles a song on and off by title and artist', () => {
  const song = { title: 'Night Drive', artist: 'The Satellites' }

  const selected = toggleSongSelection([], song)
  assert.deepEqual(selected, [song])
  assert.equal(isSongSelected(selected, song), true)

  const unselected = toggleSongSelection(selected, { ...song })
  assert.deepEqual(unselected, [])
})

test('keeps songs with the same title from different artists distinct', () => {
  const firstSong = { title: 'Home', artist: 'First Artist' }
  const secondSong = { title: 'Home', artist: 'Second Artist' }
  const selected = toggleSongSelection([firstSong], secondSong)

  assert.deepEqual(selected, [firstSong, secondSong])
  assert.equal(isSongSelected(selected, firstSong), true)
  assert.equal(isSongSelected(selected, secondSong), true)

  const remaining = removeSongSelection(selected, { ...firstSong })

  assert.deepEqual(remaining, [secondSong])
  assert.deepEqual(selected, [firstSong, secondSong])
})
