import * as THREE from 'three'

const CLICK_MOVEMENT_THRESHOLD = 4

export function movedBeyondClickThreshold(
  start,
  current,
  threshold = CLICK_MOVEMENT_THRESHOLD,
) {
  if (!start || !current) return false

  const horizontalDistance = current.x - start.x
  const verticalDistance = current.y - start.y
  return (
    (horizontalDistance ** 2) + (verticalDistance ** 2)
  ) > threshold ** 2
}

export function shouldToggleBoardSong({
  pressedTarget,
  releasedTarget,
  moved,
}) {
  return Boolean(
    !moved
    && pressedTarget
    && pressedTarget === releasedTarget
  )
}

export function createClassroomRecommendationBoardInteraction({
  canvas,
  camera,
  board,
  onToggleSong,
}) {
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  const initialCursor = canvas.style.cursor
  let pointerStart = null

  function findHitTarget(event) {
    const bounds = canvas.getBoundingClientRect()
    if (bounds.width <= 0 || bounds.height <= 0) return null

    pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1
    pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1
    raycaster.setFromCamera(pointer, camera)

    return raycaster.intersectObjects(board.getHitTargets(), false)[0]?.object ?? null
  }

  function showHitTarget(target) {
    const rowIndex = target?.userData.recommendationBoardRowIndex ?? null
    board.setHoveredRow(rowIndex)
    canvas.style.cursor = target ? 'pointer' : initialCursor
  }

  function startSelection(event) {
    if (event.button !== 0) return

    pointerStart = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      target: findHitTarget(event),
      moved: false,
    }
  }

  function trackSelection(event) {
    if (pointerStart?.pointerId === event.pointerId) {
      pointerStart.moved ||= movedBeyondClickThreshold(
        pointerStart,
        { x: event.clientX, y: event.clientY },
      )
      if (pointerStart.moved) {
        showHitTarget(null)
        return
      }
    }

    showHitTarget(findHitTarget(event))
  }

  function finishSelection(event) {
    if (!pointerStart || pointerStart.pointerId !== event.pointerId) return

    const releasedTarget = findHitTarget(event)
    const shouldToggle = shouldToggleBoardSong({
      pressedTarget: pointerStart.target,
      releasedTarget,
      moved: pointerStart.moved,
    })
    const song = shouldToggle
      ? releasedTarget.userData.recommendationBoardSong
      : null
    pointerStart = null

    if (song) onToggleSong(song)
    showHitTarget(releasedTarget)
  }

  function cancelSelection(event) {
    if (pointerStart?.pointerId !== event.pointerId) return
    pointerStart = null
    showHitTarget(null)
  }

  function clearHover() {
    if (pointerStart) return
    showHitTarget(null)
  }

  canvas.addEventListener('pointerdown', startSelection)
  canvas.addEventListener('pointermove', trackSelection)
  canvas.addEventListener('pointerup', finishSelection)
  canvas.addEventListener('pointercancel', cancelSelection)
  canvas.addEventListener('pointerleave', clearHover)

  return {
    dispose() {
      canvas.removeEventListener('pointerdown', startSelection)
      canvas.removeEventListener('pointermove', trackSelection)
      canvas.removeEventListener('pointerup', finishSelection)
      canvas.removeEventListener('pointercancel', cancelSelection)
      canvas.removeEventListener('pointerleave', clearHover)
      pointerStart = null
      board.setHoveredRow(null)
      canvas.style.cursor = initialCursor
    },
  }
}
