const DEFAULT_MARGIN = 16
const DEFAULT_VERTICAL_OFFSET = 18
const MIN_TAIL_INSET = 24
const MAX_VISIBLE_NDC_OFFSET = 1.25

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum)
}

export function calculateSpeechBubblePosition({
  normalizedX,
  normalizedY,
  normalizedZ,
  inFront,
  viewportWidth,
  viewportHeight,
  bubbleWidth,
  bubbleHeight,
  margin = DEFAULT_MARGIN,
  verticalOffset = DEFAULT_VERTICAL_OFFSET,
}) {
  const values = [
    normalizedX,
    normalizedY,
    normalizedZ,
    viewportWidth,
    viewportHeight,
    bubbleWidth,
    bubbleHeight,
  ]
  const hasValidMeasurements = values.every(Number.isFinite)
    && viewportWidth > 0
    && viewportHeight > 0
    && bubbleWidth > 0
    && bubbleHeight > 0
  const anchorIsNearViewport = Math.abs(normalizedX) <= MAX_VISIBLE_NDC_OFFSET
    && Math.abs(normalizedY) <= MAX_VISIBLE_NDC_OFFSET
  const visible = Boolean(
    hasValidMeasurements
    && inFront
    && normalizedZ >= -1
    && normalizedZ <= 1
    && anchorIsNearViewport,
  )

  if (!visible) {
    return {
      left: 0,
      top: 0,
      tailOffset: bubbleWidth / 2 || 0,
      visible: false,
    }
  }

  const anchorX = ((normalizedX + 1) / 2) * viewportWidth
  const anchorY = ((1 - normalizedY) / 2) * viewportHeight
  const maximumLeft = Math.max(margin, viewportWidth - bubbleWidth - margin)
  const maximumTop = Math.max(margin, viewportHeight - bubbleHeight - margin)
  const left = clamp(anchorX - (bubbleWidth / 2), margin, maximumLeft)
  const top = clamp(
    anchorY - bubbleHeight - verticalOffset,
    margin,
    maximumTop,
  )
  const maximumTailOffset = Math.max(
    MIN_TAIL_INSET,
    bubbleWidth - MIN_TAIL_INSET,
  )

  return {
    left,
    top,
    tailOffset: clamp(
      anchorX - left,
      MIN_TAIL_INSET,
      maximumTailOffset,
    ),
    visible: true,
  }
}
