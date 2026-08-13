import assert from 'node:assert/strict'
import test from 'node:test'

import {
  calculateJoystickInput,
  classifyPhoneViewport,
  getEntryState,
  shouldShowMobileControls,
} from '../src/ui/mobileControls.js'

test('classifies coarse-pointer phone viewports across orientation', () => {
  assert.deepEqual(classifyPhoneViewport({
    width: 390,
    height: 844,
    coarsePointer: true,
  }), {
    isPhone: true,
    isLandscape: false,
  })
  assert.deepEqual(classifyPhoneViewport({
    width: 844,
    height: 390,
    coarsePointer: true,
  }), {
    isPhone: true,
    isLandscape: true,
  })
  assert.equal(classifyPhoneViewport({
    width: 1440,
    height: 900,
    coarsePointer: false,
  }).isPhone, false)
  assert.equal(classifyPhoneViewport({
    width: 1024,
    height: 768,
    coarsePointer: true,
  }).isPhone, false)
  assert.deepEqual(classifyPhoneViewport({
    width: 375,
    height: 667,
    coarsePointer: false,
    touchCapable: true,
  }), {
    isPhone: true,
    isLandscape: false,
  })
  assert.deepEqual(classifyPhoneViewport({
    width: 667,
    height: 375,
    coarsePointer: false,
    mobileUserAgent: true,
  }), {
    isPhone: true,
    isLandscape: true,
  })
  assert.equal(classifyPhoneViewport({
    width: 375,
    height: 667,
    coarsePointer: false,
  }).isPhone, false)
})

test('reports the shared entry gate and phone rotation states', () => {
  assert.equal(getEntryState({
    requiresLandscape: false,
    isLandscape: true,
    assetsReady: false,
    entryStarted: false,
  }), 'loading')
  assert.equal(getEntryState({
    requiresLandscape: false,
    isLandscape: true,
    assetsReady: true,
    entryStarted: false,
  }), 'ready')
  assert.equal(getEntryState({
    requiresLandscape: true,
    isLandscape: false,
    assetsReady: false,
    entryStarted: false,
  }), 'rotate-to-start')
  assert.equal(getEntryState({
    requiresLandscape: true,
    isLandscape: true,
    assetsReady: false,
    entryStarted: false,
  }), 'loading')
  assert.equal(getEntryState({
    requiresLandscape: true,
    isLandscape: true,
    assetsReady: true,
    entryStarted: false,
  }), 'ready')
  assert.equal(getEntryState({
    requiresLandscape: true,
    isLandscape: false,
    assetsReady: true,
    entryStarted: true,
  }), 'rotate-to-continue')
})

test('keeps phone movement controls available throughout landscape gameplay', () => {
  assert.equal(shouldShowMobileControls({
    isPhone: true,
    isLandscape: true,
    entryStarted: true,
    loaderVisible: false,
  }), true)
  assert.equal(shouldShowMobileControls({
    isPhone: true,
    isLandscape: false,
    entryStarted: true,
    loaderVisible: false,
  }), false)
  assert.equal(shouldShowMobileControls({
    isPhone: true,
    isLandscape: true,
    entryStarted: false,
    loaderVisible: false,
  }), false)
  assert.equal(shouldShowMobileControls({
    isPhone: true,
    isLandscape: true,
    entryStarted: true,
    loaderVisible: true,
  }), false)
})

test('maps joystick drags to bounded camera-relative movement', () => {
  assert.deepEqual(calculateJoystickInput({
    centerX: 50,
    centerY: 50,
    pointerX: 55,
    pointerY: 50,
    radius: 50,
  }), {
    offsetX: 5,
    offsetY: 0,
    sideways: 0,
    forward: 0,
    running: false,
  })

  const right = calculateJoystickInput({
    centerX: 50,
    centerY: 50,
    pointerX: 100,
    pointerY: 50,
    radius: 50,
  })
  assert.equal(right.sideways, 1)
  assert.equal(right.forward, 0)
  assert.equal(right.running, true)

  const up = calculateJoystickInput({
    centerX: 50,
    centerY: 50,
    pointerX: 50,
    pointerY: 0,
    radius: 50,
  })
  assert.equal(up.sideways, 0)
  assert.equal(up.forward, 1)
  assert.equal(up.running, true)

  const walking = calculateJoystickInput({
    centerX: 0,
    centerY: 0,
    pointerX: 35,
    pointerY: 0,
    radius: 50,
  })
  assert.equal(walking.running, false)

  const justInsideRunZone = calculateJoystickInput({
    centerX: 0,
    centerY: 0,
    pointerX: 40.5,
    pointerY: 0,
    radius: 50,
  })
  assert.equal(justInsideRunZone.running, false)

  const runZoneBoundary = calculateJoystickInput({
    centerX: 0,
    centerY: 0,
    pointerX: 41,
    pointerY: 0,
    radius: 50,
  })
  assert.equal(runZoneBoundary.running, true)

  const diagonal = calculateJoystickInput({
    centerX: 0,
    centerY: 0,
    pointerX: 100,
    pointerY: -100,
    radius: 50,
  })
  assert.ok(Math.abs(Math.hypot(diagonal.offsetX, diagonal.offsetY) - 50) < 0.0001)
  assert.ok(Math.abs(Math.hypot(diagonal.sideways, diagonal.forward) - 1) < 0.0001)
  assert.equal(diagonal.running, true)
})
