import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getBoardInteractionMinimumZ,
  isBoardInteractionEnabled,
  movedBeyondClickThreshold,
  shouldToggleBoardSong,
} from '../src/classroom/classroomRecommendationBoardInteraction.js'

test('gates board interaction at the closest desk boundary', () => {
  const deskZones = [
    { bounds: { max: { z: -2.611 } } },
    { bounds: { max: { z: 1.903 } } },
    { bounds: { max: { z: 0.397 } } },
  ]

  const minimumZ = getBoardInteractionMinimumZ(deskZones)

  assert.equal(minimumZ, 2.003)
  assert.equal(isBoardInteractionEnabled({ z: 1.95 }, minimumZ), false)
  assert.equal(isBoardInteractionEnabled({ z: 2.003 }, minimumZ), true)
  assert.equal(isBoardInteractionEnabled({ z: 2.4 }, minimumZ), true)
  assert.equal(getBoardInteractionMinimumZ([]), Infinity)
  assert.equal(isBoardInteractionEnabled(null, 2.003), false)
  assert.equal(isBoardInteractionEnabled({ z: 2.4 }, Infinity), false)
})

test('distinguishes board clicks from camera dragging', () => {
  assert.equal(
    movedBeyondClickThreshold({ x: 10, y: 10 }, { x: 13, y: 12 }),
    false,
  )
  assert.equal(
    movedBeyondClickThreshold({ x: 10, y: 10 }, { x: 15, y: 10 }),
    true,
  )
})

test('toggles only a matching board row without pointer dragging', () => {
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
  assert.equal(shouldToggleBoardSong({
    pressedTarget: row,
    releasedTarget: row,
    moved: true,
  }), false)
})
