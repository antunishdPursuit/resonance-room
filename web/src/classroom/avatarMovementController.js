import * as THREE from 'three'

const MOVEMENT_KEYS = new Map([
  ['KeyW', [0, 1]],
  ['ArrowUp', [0, 1]],
  ['KeyS', [0, -1]],
  ['ArrowDown', [0, -1]],
  ['KeyA', [-1, 0]],
  ['ArrowLeft', [-1, 0]],
  ['KeyD', [1, 0]],
  ['ArrowRight', [1, 0]],
])
const RUN_KEYS = new Set(['ShiftLeft', 'ShiftRight'])
const WALK_SPEED = 1.35
const RUN_SPEED = 2.25
const AVATAR_RADIUS = 0.24
const CAMERA_FOLLOW_SPEED = 5
const CAMERA_RECENTER_DELAY = 0.4
const CAMERA_RECENTER_SPEED = 3
const CAMERA_RECENTER_DEAD_ZONE = THREE.MathUtils.degToRad(8)
const CAMERA_RECENTER_FINISH_THRESHOLD = THREE.MathUtils.degToRad(0.5)
const CAMERA_TARGET_HEIGHT = 1.15
const ROOM_EDGE_PADDING = 0.08
const CAMERA_ROTATION_SPEED = 0.004
const CAMERA_ZOOM_SPEED = 0.001
const MIN_CAMERA_DISTANCE = 2.2
const MAX_CAMERA_DISTANCE = 6
const MIN_CAMERA_PITCH = -0.15
const MAX_CAMERA_PITCH = 0.75
const CAMERA_WALL_CLEARANCE = 0.14
const MIN_BLOCKED_CAMERA_DISTANCE = 0.55

export const CAMERA_MODES = Object.freeze({
  FOLLOW: 'follow',
  FREE: 'free',
})

export function normalizeCameraMode(value) {
  return value === CAMERA_MODES.FREE
    ? CAMERA_MODES.FREE
    : CAMERA_MODES.FOLLOW
}

export function dampCameraYaw(currentYaw, targetYaw, amount) {
  const normalizedAmount = THREE.MathUtils.clamp(amount, 0, 1)
  const shortestTurn = shortestYawDelta(currentYaw, targetYaw)
  return currentYaw + (shortestTurn * normalizedAmount)
}

export function shortestYawDelta(currentYaw, targetYaw) {
  return Math.atan2(
    Math.sin(targetYaw - currentYaw),
    Math.cos(targetYaw - currentYaw),
  )
}

export function updateFollowCameraYaw({
  cameraYaw,
  targetYaw,
  delta,
  movementActive,
  idleDuration = 0,
  recentering = false,
  delay = CAMERA_RECENTER_DELAY,
  deadZone = CAMERA_RECENTER_DEAD_ZONE,
  followSpeed = CAMERA_RECENTER_SPEED,
  finishThreshold = CAMERA_RECENTER_FINISH_THRESHOLD,
}) {
  const safeDelta = Number.isFinite(delta) ? Math.max(delta, 0) : 0
  if (movementActive) {
    return {
      cameraYaw,
      idleDuration: 0,
      recentering: false,
    }
  }

  const nextIdleDuration = Math.max(idleDuration, 0) + safeDelta
  let nextRecentering = recentering
  if (
    !nextRecentering
    && nextIdleDuration >= Math.max(delay, 0)
    && Math.abs(shortestYawDelta(cameraYaw, targetYaw)) > Math.max(deadZone, 0)
  ) {
    nextRecentering = true
  }

  if (!nextRecentering) {
    return {
      cameraYaw,
      idleDuration: nextIdleDuration,
      recentering: false,
    }
  }

  let nextCameraYaw = dampCameraYaw(
    cameraYaw,
    targetYaw,
    1 - Math.exp(-Math.max(followSpeed, 0) * safeDelta),
  )
  if (
    Math.abs(shortestYawDelta(nextCameraYaw, targetYaw))
    <= Math.max(finishThreshold, 0)
  ) {
    nextCameraYaw = targetYaw
    nextRecentering = false
  }

  return {
    cameraYaw: nextCameraYaw,
    idleDuration: nextIdleDuration,
    recentering: nextRecentering,
  }
}

export function resolveFollowHeading({
  currentHeading,
  avatarYaw,
  movedX,
  movedZ,
}) {
  const actualMovement = Math.hypot(movedX, movedZ)
  return actualMovement > 0.00001 ? avatarYaw : currentHeading
}

export function resolveMovementInput({
  pressedKeys = [],
  touchSideways = 0,
  touchForward = 0,
}) {
  let sideways = Number.isFinite(touchSideways) ? touchSideways : 0
  let forward = Number.isFinite(touchForward) ? touchForward : 0

  pressedKeys.forEach((key) => {
    const keyboardInput = MOVEMENT_KEYS.get(key)
    if (!keyboardInput) return

    sideways += keyboardInput[0]
    forward += keyboardInput[1]
  })

  const magnitude = Math.hypot(sideways, forward)
  if (magnitude > 1) {
    sideways /= magnitude
    forward /= magnitude
  }

  return { sideways, forward }
}

export function shouldStartCameraOrbit({
  cameraMode = CAMERA_MODES.FOLLOW,
  button,
  pointerType,
  clientX,
  canvasLeft,
  canvasWidth,
}) {
  if (normalizeCameraMode(cameraMode) !== CAMERA_MODES.FREE) return false
  if (button !== 0) return false
  if (pointerType !== 'touch') return true
  if (!Number.isFinite(clientX) || !Number.isFinite(canvasWidth) || canvasWidth <= 0) {
    return false
  }

  return clientX >= canvasLeft + (canvasWidth / 2)
}

export function shouldRunMovement({
  keyboardRunActive = false,
  touchRunActive = false,
  touchSideways = 0,
  touchForward = 0,
}) {
  const hasTouchMovement = Math.hypot(touchSideways, touchForward) > 0
  return Boolean(
    keyboardRunActive || (touchRunActive && hasTouchMovement),
  )
}

export function resolveCameraPosition({
  target,
  desiredPosition,
  blockers = [],
  raycaster = new THREE.Raycaster(),
  direction = new THREE.Vector3(),
  result = new THREE.Vector3(),
  clearance = CAMERA_WALL_CLEARANCE,
}) {
  result.copy(desiredPosition)
  if (!blockers.length) return result

  direction.subVectors(desiredPosition, target)
  const desiredDistance = direction.length()
  if (desiredDistance <= 0) return result

  direction.normalize()
  raycaster.set(target, direction)
  raycaster.near = 0
  raycaster.far = desiredDistance
  const obstruction = raycaster.intersectObjects(blockers, false)[0]
  if (!obstruction) return result

  const resolvedDistance = Math.max(
    obstruction.distance - Math.max(clearance, 0),
    MIN_BLOCKED_CAMERA_DISTANCE,
  )
  return result.copy(direction).multiplyScalar(resolvedDistance).add(target)
}

function isFormControl(element) {
  return element instanceof HTMLElement
    && (
      element.isContentEditable
      || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(element.tagName)
    )
}

function circleIntersectsBounds(x, z, radius, bounds) {
  const closestX = THREE.MathUtils.clamp(x, bounds.min.x, bounds.max.x)
  const closestZ = THREE.MathUtils.clamp(z, bounds.min.z, bounds.max.z)
  const xDistance = x - closestX
  const zDistance = z - closestZ

  return (xDistance ** 2) + (zDistance ** 2) < radius ** 2
}

function canOccupy(x, z, environment) {
  const room = environment.walkableBounds
  const edgeDistance = AVATAR_RADIUS + ROOM_EDGE_PADDING
  const insideRoom = x >= room.min.x + edgeDistance
    && x <= room.max.x - edgeDistance
    && z >= room.min.z + edgeDistance
    && z <= room.max.z - edgeDistance

  return insideRoom && !environment.obstacles.some(
    obstacle => circleIntersectsBounds(x, z, AVATAR_RADIUS, obstacle.bounds),
  )
}

export function createAvatarMovementController({
  avatarRoot,
  camera,
  canvas,
  environment,
  cameraBlockers = [],
}) {
  const pressedKeys = new Set()
  const pressedRunKeys = new Set()
  const movementInput = new THREE.Vector2()
  const touchMovement = new THREE.Vector2()
  const worldMovement = new THREE.Vector2()
  const desiredCameraPosition = new THREE.Vector3()
  const cameraLookTarget = new THREE.Vector3()
  const unobstructedCameraPosition = new THREE.Vector3()
  const cameraRayDirection = new THREE.Vector3()
  const cameraRaycaster = new THREE.Raycaster()
  const smoothedCameraTarget = new THREE.Vector3(
    avatarRoot.position.x,
    avatarRoot.position.y + CAMERA_TARGET_HEIGHT,
    avatarRoot.position.z,
  )
  const startingCameraOffset = camera.position.clone().sub(smoothedCameraTarget)
  const startingCameraDistance = THREE.MathUtils.clamp(
    startingCameraOffset.length(),
    MIN_CAMERA_DISTANCE,
    MAX_CAMERA_DISTANCE,
  )
  const startingHorizontalDistance = Math.hypot(
    startingCameraOffset.x,
    startingCameraOffset.z,
  )
  const startingYaw = Math.atan2(
    startingCameraOffset.x,
    startingCameraOffset.z,
  )
  const startingPitch = Math.atan2(
    startingCameraOffset.y,
    startingHorizontalDistance,
  )
  let cameraYaw = startingYaw
  let cameraPitch = THREE.MathUtils.clamp(
    startingPitch,
    MIN_CAMERA_PITCH,
    MAX_CAMERA_PITCH,
  )
  let cameraDistance = startingCameraDistance
  let orbitPointerId = null
  let orbitPointerType = null
  let lastPointerX = 0
  let lastPointerY = 0
  let touchRunActive = false
  let cameraMode = CAMERA_MODES.FOLLOW
  let followHeading = avatarRoot.rotation.y
  let followIdleDuration = 0
  let followRecentering = false

  function onKeyDown(event) {
    const isMovementKey = MOVEMENT_KEYS.has(event.code)
    const isRunKey = RUN_KEYS.has(event.code)
    if ((!isMovementKey && !isRunKey) || isFormControl(event.target)) return

    event.preventDefault()
    if (isMovementKey) pressedKeys.add(event.code)
    if (isRunKey) pressedRunKeys.add(event.code)
  }

  function onKeyUp(event) {
    const isMovementKey = MOVEMENT_KEYS.has(event.code)
    const isRunKey = RUN_KEYS.has(event.code)
    if (!isMovementKey && !isRunKey) return

    event.preventDefault()
    if (isMovementKey) pressedKeys.delete(event.code)
    if (isRunKey) pressedRunKeys.delete(event.code)
  }

  function clearKeys() {
    pressedKeys.clear()
    pressedRunKeys.clear()
  }

  function clearTouchMovement() {
    touchMovement.set(0, 0)
    touchRunActive = false
  }

  function cancelTouchInput() {
    clearTouchMovement()
    if (orbitPointerType !== 'touch' || orbitPointerId === null) return

    const pointerId = orbitPointerId
    orbitPointerId = null
    orbitPointerType = null
    if (canvas.hasPointerCapture?.(pointerId)) {
      canvas.releasePointerCapture(pointerId)
    }
  }

  function clearAllInput() {
    clearKeys()
    cancelTouchInput()
  }

  function getDesiredCameraPosition(target = smoothedCameraTarget) {
    const horizontalDistance = Math.cos(cameraPitch) * cameraDistance
    unobstructedCameraPosition.set(
      target.x + Math.sin(cameraYaw) * horizontalDistance,
      target.y + Math.sin(cameraPitch) * cameraDistance,
      target.z + Math.cos(cameraYaw) * horizontalDistance,
    )

    return resolveCameraPosition({
      target,
      desiredPosition: unobstructedCameraPosition,
      blockers: cameraBlockers,
      raycaster: cameraRaycaster,
      direction: cameraRayDirection,
      result: desiredCameraPosition,
    })
  }

  function setCameraTarget(target) {
    cameraLookTarget.set(
      avatarRoot.position.x,
      avatarRoot.position.y + CAMERA_TARGET_HEIGHT,
      avatarRoot.position.z,
    )
    target.copy(cameraLookTarget)
  }

  function startOrbit(event) {
    if (orbitPointerId !== null) return

    const bounds = canvas.getBoundingClientRect()
    if (!shouldStartCameraOrbit({
      cameraMode,
      button: event.button,
      pointerType: event.pointerType,
      clientX: event.clientX,
      canvasLeft: bounds.left,
      canvasWidth: bounds.width,
    })) return

    orbitPointerId = event.pointerId
    orbitPointerType = event.pointerType
    lastPointerX = event.clientX
    lastPointerY = event.clientY
    canvas.setPointerCapture?.(event.pointerId)
  }

  function updateOrbit(event) {
    if (event.pointerId !== orbitPointerId) return

    const horizontalMovement = event.clientX - lastPointerX
    const verticalMovement = event.clientY - lastPointerY
    lastPointerX = event.clientX
    lastPointerY = event.clientY

    cameraYaw -= horizontalMovement * CAMERA_ROTATION_SPEED
    cameraPitch = THREE.MathUtils.clamp(
      cameraPitch + (verticalMovement * CAMERA_ROTATION_SPEED),
      MIN_CAMERA_PITCH,
      MAX_CAMERA_PITCH,
    )
  }

  function stopOrbit(event) {
    if (event.pointerId !== orbitPointerId) return

    canvas.releasePointerCapture?.(event.pointerId)
    orbitPointerId = null
    orbitPointerType = null
  }

  function zoomCamera(event) {
    if (cameraMode !== CAMERA_MODES.FREE) return

    event.preventDefault()
    cameraDistance = THREE.MathUtils.clamp(
      cameraDistance * Math.exp(event.deltaY * CAMERA_ZOOM_SPEED),
      MIN_CAMERA_DISTANCE,
      MAX_CAMERA_DISTANCE,
    )
  }

  function resetCamera() {
    cameraYaw = cameraMode === CAMERA_MODES.FOLLOW
      ? avatarRoot.rotation.y
      : startingYaw
    cameraPitch = THREE.MathUtils.clamp(
      startingPitch,
      MIN_CAMERA_PITCH,
      MAX_CAMERA_PITCH,
    )
    cameraDistance = startingCameraDistance
    followHeading = avatarRoot.rotation.y
    followIdleDuration = 0
    followRecentering = false
    setCameraTarget(smoothedCameraTarget)
    camera.position.copy(getDesiredCameraPosition())
    camera.lookAt(smoothedCameraTarget)
  }

  function setCameraMode(value) {
    const nextMode = normalizeCameraMode(value)
    if (nextMode === cameraMode) return

    cameraMode = nextMode
    if (cameraMode !== CAMERA_MODES.FOLLOW) return

    if (orbitPointerId !== null) {
      const pointerId = orbitPointerId
      orbitPointerId = null
      orbitPointerType = null
      if (canvas.hasPointerCapture?.(pointerId)) {
        canvas.releasePointerCapture(pointerId)
      }
    }
    resetCamera()
  }

  function update(delta) {
    const previousX = avatarRoot.position.x
    const previousZ = avatarRoot.position.z
    const resolvedInput = resolveMovementInput({
      pressedKeys,
      touchSideways: touchMovement.x,
      touchForward: touchMovement.y,
    })
    movementInput.set(resolvedInput.sideways, resolvedInput.forward)

    if (movementInput.lengthSq() > 0) {
      // Convert input to world space so movement follows the camera view.
      const forwardX = -Math.sin(cameraYaw)
      const forwardZ = -Math.cos(cameraYaw)
      const rightX = Math.cos(cameraYaw)
      const rightZ = -Math.sin(cameraYaw)
      worldMovement.set(
        (rightX * movementInput.x) + (forwardX * movementInput.y),
        (rightZ * movementInput.x) + (forwardZ * movementInput.y),
      ).normalize()

      const running = shouldRunMovement({
        keyboardRunActive: pressedRunKeys.size > 0,
        touchRunActive,
        touchSideways: touchMovement.x,
        touchForward: touchMovement.y,
      })
      const speed = running ? RUN_SPEED : WALK_SPEED
      const distance = speed * Math.min(delta, 0.05)
      const nextX = avatarRoot.position.x + worldMovement.x * distance
      const nextZ = avatarRoot.position.z + worldMovement.y * distance

      // Resolve each axis separately so Riri slides along obstacles instead of
      // stopping when only one direction is blocked.
      if (canOccupy(nextX, avatarRoot.position.z, environment)) {
        avatarRoot.position.x = nextX
      }
      if (canOccupy(avatarRoot.position.x, nextZ, environment)) {
        avatarRoot.position.z = nextZ
      }

      avatarRoot.rotation.y = Math.atan2(
        -worldMovement.x,
        -worldMovement.y,
      )
    }

    const movedX = avatarRoot.position.x - previousX
    const movedZ = avatarRoot.position.z - previousZ
    const moving = Math.hypot(movedX, movedZ) > 0.00001
    followHeading = resolveFollowHeading({
      currentHeading: followHeading,
      avatarYaw: avatarRoot.rotation.y,
      movedX,
      movedZ,
    })

    if (cameraMode === CAMERA_MODES.FOLLOW) {
      const followState = updateFollowCameraYaw({
        cameraYaw,
        targetYaw: followHeading,
        delta,
        movementActive: movementInput.lengthSq() > 0,
        idleDuration: followIdleDuration,
        recentering: followRecentering,
      })
      cameraYaw = followState.cameraYaw
      followIdleDuration = followState.idleDuration
      followRecentering = followState.recentering
    }

    const followAmount = 1 - Math.exp(-CAMERA_FOLLOW_SPEED * delta)
    setCameraTarget(cameraLookTarget)
    smoothedCameraTarget.lerp(cameraLookTarget, followAmount)
    camera.position.lerp(getDesiredCameraPosition(), followAmount)
    camera.lookAt(smoothedCameraTarget)

    return {
      moving,
      running: moving && shouldRunMovement({
        keyboardRunActive: pressedRunKeys.size > 0,
        touchRunActive,
        touchSideways: touchMovement.x,
        touchForward: touchMovement.y,
      }),
    }
  }

  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', clearAllInput)
  canvas.addEventListener('pointerdown', startOrbit)
  canvas.addEventListener('pointermove', updateOrbit)
  canvas.addEventListener('pointerup', stopOrbit)
  canvas.addEventListener('pointercancel', stopOrbit)
  canvas.addEventListener('wheel', zoomCamera, { passive: false })

  resetCamera()

  return {
    getPosition() {
      return {
        x: Number(avatarRoot.position.x.toFixed(3)),
        y: Number(avatarRoot.position.y.toFixed(3)),
        z: Number(avatarRoot.position.z.toFixed(3)),
      }
    },
    setTouchMovement(sideways, forward, running = false) {
      touchMovement.set(
        Number.isFinite(sideways) ? sideways : 0,
        Number.isFinite(forward) ? forward : 0,
      )
      touchRunActive = Boolean(running)
    },
    cancelTouchInput,
    getCameraMode() {
      return cameraMode
    },
    getCameraState() {
      return {
        avatarYaw: Number(avatarRoot.rotation.y.toFixed(3)),
        cameraYaw: Number(cameraYaw.toFixed(3)),
        mode: cameraMode,
      }
    },
    resetCamera,
    setCameraMode,
    update,
    dispose() {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', clearAllInput)
      canvas.removeEventListener('pointerdown', startOrbit)
      canvas.removeEventListener('pointermove', updateOrbit)
      canvas.removeEventListener('pointerup', stopOrbit)
      canvas.removeEventListener('pointercancel', stopOrbit)
      canvas.removeEventListener('wheel', zoomCamera)
      clearAllInput()
      orbitPointerId = null
      orbitPointerType = null
    },
  }
}
