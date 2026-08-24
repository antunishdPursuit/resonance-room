import assert from 'node:assert/strict'
import test from 'node:test'
import * as THREE from 'three'

import {
  CAMERA_MODES,
  dampCameraYaw,
  normalizeCameraMode,
  resolveCameraPosition,
  resolveFollowHeading,
  resolveMovementInput,
  shouldRunMovement,
  shouldStartCameraOrbit,
  updateFollowCameraYaw,
} from '../src/classroom/avatarMovementController.js'

test('keeps the camera inside a blocking classroom wall', () => {
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 3, 4),
    new THREE.MeshBasicMaterial(),
  )
  wall.position.set(2, 1.5, 0)
  wall.updateMatrixWorld(true)

  const resolved = resolveCameraPosition({
    target: new THREE.Vector3(0, 1.15, 0),
    desiredPosition: new THREE.Vector3(4, 1.15, 0),
    blockers: [wall],
  })

  assert.ok(resolved.x < 1.9)
  assert.equal(resolved.y, 1.15)
  assert.equal(resolved.z, 0)

  wall.geometry.dispose()
  wall.material.dispose()
})

test('preserves the desired camera position when the room shell is clear', () => {
  const desiredPosition = new THREE.Vector3(0, 2, 3)
  const resolved = resolveCameraPosition({
    target: new THREE.Vector3(0, 1, 0),
    desiredPosition,
  })

  assert.deepEqual(resolved.toArray(), desiredPosition.toArray())
})

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

test('defaults to fixed follow camera and enables orbit only in free mode', () => {
  const common = {
    button: 0,
    clientX: 100,
    canvasLeft: 0,
    canvasWidth: 400,
  }

  assert.equal(shouldStartCameraOrbit({
    ...common,
    pointerType: 'mouse',
  }), false)
  assert.equal(shouldStartCameraOrbit({
    ...common,
    cameraMode: CAMERA_MODES.FREE,
    pointerType: 'mouse',
  }), true)
  assert.equal(shouldStartCameraOrbit({
    ...common,
    cameraMode: CAMERA_MODES.FREE,
    pointerType: 'touch',
  }), false)
  assert.equal(shouldStartCameraOrbit({
    ...common,
    cameraMode: CAMERA_MODES.FREE,
    pointerType: 'touch',
    clientX: 200,
  }), true)
  assert.equal(shouldStartCameraOrbit({
    ...common,
    cameraMode: CAMERA_MODES.FREE,
    pointerType: 'touch',
    clientX: 350,
  }), true)
  assert.equal(shouldStartCameraOrbit({
    ...common,
    cameraMode: CAMERA_MODES.FREE,
    pointerType: 'touch',
    clientX: 350,
    button: 2,
  }), false)
})

test('normalizes unsupported camera modes to the fixed follow default', () => {
  assert.equal(normalizeCameraMode(CAMERA_MODES.FOLLOW), CAMERA_MODES.FOLLOW)
  assert.equal(normalizeCameraMode(CAMERA_MODES.FREE), CAMERA_MODES.FREE)
  assert.equal(normalizeCameraMode('orbit'), CAMERA_MODES.FOLLOW)
  assert.equal(normalizeCameraMode(), CAMERA_MODES.FOLLOW)
})

test('damps follow-camera yaw along the shortest turn', () => {
  assert.equal(dampCameraYaw(0, Math.PI / 2, 0.5), Math.PI / 4)
  assert.equal(dampCameraYaw(0, Math.PI / 2, 2), Math.PI / 2)

  const acrossBoundary = dampCameraYaw(3.1, -3.1, 0.5)
  assert.ok(Math.abs(acrossBoundary - Math.PI) < 0.001)
})

test('keeps follow-camera yaw stable during movement and waits before recentering', () => {
  const moving = updateFollowCameraYaw({
    cameraYaw: 0,
    targetYaw: Math.PI / 2,
    delta: 1,
    movementActive: true,
    idleDuration: 2,
    recentering: true,
  })
  assert.deepEqual(moving, {
    cameraYaw: 0,
    idleDuration: 0,
    recentering: false,
  })

  const waiting = updateFollowCameraYaw({
    cameraYaw: 0,
    targetYaw: Math.PI / 2,
    delta: 0.2,
    movementActive: false,
  })
  assert.equal(waiting.cameraYaw, 0)
  assert.equal(waiting.recentering, false)

  const recentering = updateFollowCameraYaw({
    cameraYaw: waiting.cameraYaw,
    targetYaw: Math.PI / 2,
    delta: 0.25,
    movementActive: false,
    idleDuration: waiting.idleDuration,
  })
  assert.ok(recentering.cameraYaw > 0)
  assert.equal(recentering.recentering, true)
})

test('ignores small follow headings and completes a meaningful recenter', () => {
  const ignored = updateFollowCameraYaw({
    cameraYaw: 0,
    targetYaw: 0.05,
    delta: 1,
    movementActive: false,
  })
  assert.equal(ignored.cameraYaw, 0)
  assert.equal(ignored.recentering, false)

  let state = {
    cameraYaw: 0,
    idleDuration: 0,
    recentering: false,
  }
  for (let frame = 0; frame < 180; frame += 1) {
    state = updateFollowCameraYaw({
      ...state,
      targetYaw: Math.PI / 2,
      delta: 1 / 60,
      movementActive: false,
    })
  }

  assert.equal(state.cameraYaw, Math.PI / 2)
  assert.equal(state.recentering, false)
})

test('recenters behind Riri when collision makes her slide sideways', () => {
  assert.equal(resolveFollowHeading({
    currentHeading: 0,
    avatarYaw: Math.PI / 4,
    movedX: 0.1,
    movedZ: 0,
  }), Math.PI / 4)

  assert.equal(resolveFollowHeading({
    currentHeading: 0,
    avatarYaw: Math.PI / 4,
    movedX: 0,
    movedZ: 0,
  }), 0)
})
