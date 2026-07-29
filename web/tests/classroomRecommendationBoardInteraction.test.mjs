import assert from 'node:assert/strict'
import test from 'node:test'

import {
  movedBeyondClickThreshold,
  shouldToggleBoardSong,
} from '../src/classroom/classroomRecommendationBoardInteraction.js'

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
