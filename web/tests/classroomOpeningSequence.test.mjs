import test from 'node:test'
import assert from 'node:assert/strict'

import {
  CLASSROOM_OPENING_COMPOSITION,
  positionOpeningAvatar,
  positionOpeningCamera,
} from '../src/classroom/classroomOpeningSequence.js'

function createPositionRecorder() {
  return {
    values: null,
    set(x, y, z) {
      this.values = { x, y, z }
    },
  }
}

test('positions Esme at the approved front-classroom opening location', () => {
  const position = createPositionRecorder()

  positionOpeningAvatar({ position })

  assert.deepEqual(position.values, CLASSROOM_OPENING_COMPOSITION.avatar)
})

test('positions the camera relative to Esme and aims at her upper body', () => {
  const position = createPositionRecorder()
  let target = null
  const camera = {
    position,
    lookAt(x, y, z) {
      target = { x, y, z }
    },
  }

  positionOpeningCamera(camera)

  assert.deepEqual(position.values, CLASSROOM_OPENING_COMPOSITION.camera)
  assert.deepEqual(target, CLASSROOM_OPENING_COMPOSITION.target)
  assert.ok(
    Math.abs(
      CLASSROOM_OPENING_COMPOSITION.camera.x
        - CLASSROOM_OPENING_COMPOSITION.avatar.x
        + 0.4,
    ) < Number.EPSILON,
  )
  assert.equal(
    CLASSROOM_OPENING_COMPOSITION.camera.z
      - CLASSROOM_OPENING_COMPOSITION.avatar.z,
    -4,
  )
})
