import assert from 'node:assert/strict'
import test from 'node:test'

import {
  resolveMovementInput,
  shouldRunMovement,
  shouldStartCameraOrbit,
} from '../src/classroom/avatarMovementController.js'

test('preserves keyboard movement and combines it safely with touch input', () => {
  const keyboard = resolveMovementInput({
    pressedKeys: ['KeyW', 'KeyD'],
  })
  assert.ok(Math.abs(Math.hypot(keyboard.sideways, keyboard.forward) - 1) < 0.0001)
  assert.ok(keyboard.sideways > 0)
  assert.ok(keyboard.forward > 0)

  assert.deepEqual(resolveMovementInput({
    touchSideways: -0.5,
    touchForward: 0.25,
  }), {
    sideways: -0.5,
    forward: 0.25,
  })

  const combined = resolveMovementInput({
    pressedKeys: ['KeyW'],
    touchSideways: 1,
    touchForward: 1,
  })
  assert.ok(Math.abs(Math.hypot(combined.sideways, combined.forward) - 1) < 0.0001)
})

test('runs from Shift or an active outer-ring joystick input', () => {
  assert.equal(shouldRunMovement({ keyboardRunActive: true }), true)
  assert.equal(shouldRunMovement({
    touchRunActive: true,
    touchForward: 1,
  }), true)
  assert.equal(shouldRunMovement({
    touchRunActive: false,
    touchForward: 1,
  }), false)
  assert.equal(shouldRunMovement({
    touchRunActive: true,
    touchForward: 0,
    touchSideways: 0,
  }), false)
})

test('keeps mouse orbit unchanged and reserves phone touch orbit for the right half', () => {
  const common = {
    button: 0,
    clientX: 100,
    canvasLeft: 0,
    canvasWidth: 400,
  }

  assert.equal(shouldStartCameraOrbit({
    ...common,
    pointerType: 'mouse',
  }), true)
  assert.equal(shouldStartCameraOrbit({
    ...common,
    pointerType: 'touch',
  }), false)
  assert.equal(shouldStartCameraOrbit({
    ...common,
    pointerType: 'touch',
    clientX: 200,
  }), true)
  assert.equal(shouldStartCameraOrbit({
    ...common,
    pointerType: 'touch',
    clientX: 350,
  }), true)
  assert.equal(shouldStartCameraOrbit({
    ...common,
    pointerType: 'touch',
    clientX: 350,
    button: 2,
  }), false)
})
