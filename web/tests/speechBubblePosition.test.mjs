import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateSpeechBubblePosition } from '../src/ui/speechBubblePosition.js'

const BASE_INPUT = {
  normalizedX: 0,
  normalizedY: 0,
  normalizedZ: 0,
  inFront: true,
  viewportWidth: 1000,
  viewportHeight: 800,
  bubbleWidth: 320,
  bubbleHeight: 100,
}

test('centers the bubble above the projected head position', () => {
  const position = calculateSpeechBubblePosition(BASE_INPUT)

  assert.deepEqual(position, {
    left: 340,
    top: 282,
    tailOffset: 160,
    visible: true,
  })
})

test('clamps the bubble and tail near the viewport edges', () => {
  const leftEdge = calculateSpeechBubblePosition({
    ...BASE_INPUT,
    normalizedX: -1,
  })
  const rightEdge = calculateSpeechBubblePosition({
    ...BASE_INPUT,
    normalizedX: 1,
  })

  assert.equal(leftEdge.left, 16)
  assert.equal(leftEdge.tailOffset, 24)
  assert.equal(rightEdge.left, 664)
  assert.equal(rightEdge.tailOffset, 296)
})

test('keeps the bubble inside the top viewport margin', () => {
  const position = calculateSpeechBubblePosition({
    ...BASE_INPUT,
    normalizedY: 1,
  })

  assert.equal(position.top, 16)
})

test('hides the bubble when its anchor is behind or outside the camera view', () => {
  const behindCamera = calculateSpeechBubblePosition({
    ...BASE_INPUT,
    inFront: false,
  })
  const outsideDepth = calculateSpeechBubblePosition({
    ...BASE_INPUT,
    normalizedZ: 2,
  })
  const farOutsideViewport = calculateSpeechBubblePosition({
    ...BASE_INPUT,
    normalizedX: 1.5,
  })

  assert.equal(behindCamera.visible, false)
  assert.equal(outsideDepth.visible, false)
  assert.equal(farOutsideViewport.visible, false)
})

test('hides the bubble when measurements are invalid', () => {
  const position = calculateSpeechBubblePosition({
    ...BASE_INPUT,
    bubbleWidth: 0,
  })

  assert.equal(position.visible, false)
})
