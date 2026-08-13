export const PHONE_SHORT_EDGE_MAX = 600
export const JOYSTICK_DEAD_ZONE = 0.12
export const JOYSTICK_RUN_THRESHOLD = 0.82

export function classifyPhoneViewport({
  width,
  height,
  coarsePointer,
  touchCapable = false,
  mobileUserAgent = false,
}) {
  const hasUsableViewport = Number.isFinite(width)
    && Number.isFinite(height)
    && width > 0
    && height > 0
  const hasPhoneInputSignal = Boolean(
    coarsePointer || touchCapable || mobileUserAgent,
  )
  const isPhone = hasPhoneInputSignal
    && hasUsableViewport
    && Math.min(width, height) <= PHONE_SHORT_EDGE_MAX

  return {
    isPhone,
    isLandscape: isPhone && width > height,
  }
}

export function getEntryState({
  requiresLandscape,
  isLandscape,
  assetsReady,
  entryStarted,
}) {
  if (requiresLandscape && !isLandscape) {
    return entryStarted ? 'rotate-to-continue' : 'rotate-to-start'
  }
  if (entryStarted) return 'entering'
  return assetsReady ? 'ready' : 'loading'
}

export function shouldShowMobileControls({
  isPhone,
  isLandscape,
  entryStarted,
  loaderVisible,
}) {
  return Boolean(
    isPhone
    && isLandscape
    && entryStarted
    && !loaderVisible,
  )
}

export function calculateJoystickInput({
  centerX,
  centerY,
  pointerX,
  pointerY,
  radius,
  deadZone = JOYSTICK_DEAD_ZONE,
  runThreshold = JOYSTICK_RUN_THRESHOLD,
}) {
  if (
    !Number.isFinite(centerX)
    || !Number.isFinite(centerY)
    || !Number.isFinite(pointerX)
    || !Number.isFinite(pointerY)
    || !Number.isFinite(radius)
    || radius <= 0
  ) {
    return {
      offsetX: 0,
      offsetY: 0,
      sideways: 0,
      forward: 0,
      running: false,
    }
  }

  const rawX = pointerX - centerX
  const rawY = pointerY - centerY
  const distance = Math.hypot(rawX, rawY)
  const clampScale = distance > radius ? radius / distance : 1
  const offsetX = rawX * clampScale
  const offsetY = rawY * clampScale
  const normalizedDistance = Math.min(distance / radius, 1)
  const safeDeadZone = Math.min(Math.max(deadZone, 0), 0.95)
  const safeRunThreshold = Math.min(
    Math.max(runThreshold, safeDeadZone),
    1,
  )

  if (distance === 0 || normalizedDistance <= safeDeadZone) {
    return {
      offsetX,
      offsetY,
      sideways: 0,
      forward: 0,
      running: false,
    }
  }

  const inputMagnitude = (normalizedDistance - safeDeadZone)
    / (1 - safeDeadZone)

  return {
    offsetX,
    offsetY,
    sideways: rawX === 0 ? 0 : (rawX / distance) * inputMagnitude,
    forward: rawY === 0 ? 0 : -(rawY / distance) * inputMagnitude,
    running: normalizedDistance >= safeRunThreshold,
  }
}
