export const LONG_IDLE_ANIMATION_LOAD_DELAY_MS = 5000

export function scheduleLongIdleAnimationLoad(
  load,
  {
    delay = LONG_IDLE_ANIMATION_LOAD_DELAY_MS,
    setTimer = globalThis.setTimeout,
    clearTimer = globalThis.clearTimeout,
  } = {},
) {
  const timer = setTimer(load, delay)
  return () => clearTimer(timer)
}
