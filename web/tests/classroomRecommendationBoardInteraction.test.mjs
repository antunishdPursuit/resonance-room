import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getBoardInteractionMinimumZ,
  isBoardInteractionEnabled,
  movedBeyondClickThreshold,
  shouldToggleBoardSong,
} from '../src/classroom/classroomRecommendationBoardInteraction.js'

test('places the interaction boundary just past the closest desk row', () => {
  const deskZones = [
    { bounds: { max: { z: -2.611 } } },
    { bounds: { max: { z: 1.903 } } },
    { bounds: { max: { z: 0.397 } } },
  ]

  assert.equal(getBoardInteractionMinimumZ(deskZones), 2.003)
})

test('keeps board interaction disabled until Esme passes the boundary', () => {
  const minimumZ = 2.003

  assert.equal(isBoardInteractionEnabled({ z: 1.95 }, minimumZ), false)
  assert.equal(isBoardInteractionEnabled({ z: 2.003 }, minimumZ), true)
  assert.equal(isBoardInteractionEnabled({ z: 2.4 }, minimumZ), true)
})

test('fails closed when the desk boundary or avatar position is unavailable', () => {
  assert.equal(getBoardInteractionMinimumZ([]), Infinity)
  assert.equal(isBoardInteractionEnabled(null, 2.003), false)
  assert.equal(isBoardInteractionEnabled({ z: 2.4 }, Infinity), false)
})

test('keeps pointer movement within the click threshold selectable', () => {
  assert.equal(
    movedBeyondClickThreshold({ x: 10, y: 10 }, { x: 13, y: 12 }),
    false,
  )
})

test('treats pointer movement beyond four pixels as a drag', () => {
  assert.equal(
    movedBeyondClickThreshold({ x: 10, y: 10 }, { x: 15, y: 10 }),
    true,
  )
})

test('toggles only when press and release use the same board row', () => {
  const row = {}

  assert.equal(shouldToggleBoardSong({
    pressedTarget: row,
    releasedTarget: row,
    moved: false,
  }), true)
  assert.equal(shouldToggleBoardSong({
    pressedTarget: row,
    releasedTarget: {},
    moved: false,
  }), false)
})

test('does not toggle a board row after camera dragging', () => {
  const row = {}

  assert.equal(shouldToggleBoardSong({
    pressedTarget: row,
    releasedTarget: row,
    moved: true,
  }), false)
})
