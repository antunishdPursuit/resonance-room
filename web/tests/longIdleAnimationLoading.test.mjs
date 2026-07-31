import assert from 'node:assert/strict'
import test from 'node:test'
import {
  LONG_IDLE_ANIMATION_LOAD_DELAY_MS,
  scheduleLongIdleAnimationLoad,
} from '../src/animations/longIdleAnimationLoading.js'

test('defers long-idle animation loading until after the opening sequence', () => {
  let scheduledDelay
  let scheduledLoad
  const load = () => {}

  scheduleLongIdleAnimationLoad(load, {
    setTimer(callback, delay) {
      scheduledLoad = callback
      scheduledDelay = delay
      return 7
    },
    clearTimer() {},
  })

  assert.equal(scheduledLoad, load)
  assert.equal(scheduledDelay, LONG_IDLE_ANIMATION_LOAD_DELAY_MS)
})

test('cancels a pending long-idle animation load during scene cleanup', () => {
  let clearedTimer
  const cancel = scheduleLongIdleAnimationLoad(() => {}, {
    setTimer() {
      return 11
    },
    clearTimer(timer) {
      clearedTimer = timer
    },
  })

  cancel()

  assert.equal(clearedTimer, 11)
})
