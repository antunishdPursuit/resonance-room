import { VRMExpressionPresetName } from '@pixiv/three-vrm'

// Randomized interval (3–5 s) so blinks don't fall on a fixed beat.
export function createBlinkState() {
  return {
    timer:    0,
    interval: 3 + Math.random() * 2,
    active:   false,
    progress: 0,
  }
}

// Sin curve over progress gives a natural ease-in/out shape for the blink.
export function updateBlink(vrm, state, delta) {
  state.timer += delta

  if (!state.active && state.timer >= state.interval) {
    state.active   = true
    state.timer    = 0
    state.interval = 3 + Math.random() * 2
  }

  if (state.active) {
    state.progress += delta * 8
    const v = Math.max(0, Math.sin(state.progress * Math.PI))
    vrm.expressionManager?.setValue(VRMExpressionPresetName.Blink, v)

    if (state.progress >= 1) {
      state.active   = false
      state.progress = 0
      vrm.expressionManager?.setValue(VRMExpressionPresetName.Blink, 0)
    }
  }
}
