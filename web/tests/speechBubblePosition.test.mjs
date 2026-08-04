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

test('positions and clamps a visible bubble around Esme', () => {
  const position = calculateSpeechBubblePosition(BASE_INPUT)

  assert.deepEqual(position, {
    left: 340,
    top: 282,
    tailOffset: 160,
    visible: true,
  })
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
  const topEdge = calculateSpeechBubblePosition({
    ...BASE_INPUT,
    normalizedY: 1,
  })

  assert.equal(topEdge.top, 16)
})

test('hides a bubble that cannot be positioned safely', () => {
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
  const invalidMeasurement = calculateSpeechBubblePosition({
    ...BASE_INPUT,
    bubbleWidth: 0,
  })

  assert.equal(invalidMeasurement.visible, false)
})
