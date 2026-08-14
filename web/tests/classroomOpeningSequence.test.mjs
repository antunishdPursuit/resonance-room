import test from 'node:test'
import assert from 'node:assert/strict'

import {
  CLASSROOM_OPENING_COMPOSITION,
  OPENING_FADE_DURATION_MS,
  OPENING_GREETING_REVEAL_DELAY_MS,
  positionOpeningAvatar,
  positionOpeningCamera,
  shouldStartOpeningGreeting,
} from '../src/classroom/classroomOpeningSequence.js'

function createPositionRecorder() {
  return {
    values: null,
    set(x, y, z) {
      this.values = { x, y, z }
    },
  }
}

test('positions Riri and the camera in the approved opening composition', () => {
  const avatarPosition = createPositionRecorder()
  const cameraPosition = createPositionRecorder()
  let target = null
  const camera = {
    position: cameraPosition,
    lookAt(x, y, z) {
      target = { x, y, z }
    },
  }

  positionOpeningAvatar({ position: avatarPosition })
  positionOpeningCamera(camera)

  assert.deepEqual(
    avatarPosition.values,
    CLASSROOM_OPENING_COMPOSITION.avatar,
  )
  assert.deepEqual(
    cameraPosition.values,
    CLASSROOM_OPENING_COMPOSITION.camera,
  )
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

test('starts the greeting once after the classroom and animation settle', () => {
  assert.equal(shouldStartOpeningGreeting({
    classroomReady: false,
    greetingReady: true,
    greetingPlayed: false,
  }), false)
  assert.equal(shouldStartOpeningGreeting({
    classroomReady: true,
    greetingReady: false,
    greetingPlayed: false,
  }), false)
  assert.equal(shouldStartOpeningGreeting({
    classroomReady: true,
    greetingReady: true,
    greetingPlayed: false,
  }), true)
  assert.equal(shouldStartOpeningGreeting({
    classroomReady: true,
    greetingReady: true,
    greetingPlayed: true,
  }), false)
})

test('reveals early enough to show most of the replacement greeting', () => {
  assert.ok(
    OPENING_GREETING_REVEAL_DELAY_MS <= OPENING_FADE_DURATION_MS,
  )
})
