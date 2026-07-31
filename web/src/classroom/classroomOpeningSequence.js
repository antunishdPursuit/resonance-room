export const CLASSROOM_OPENING_COMPOSITION = Object.freeze({
  avatar: Object.freeze({ x: 0.75, y: 0, z: 2.55 }),
  camera: Object.freeze({ x: 0.35, y: 1.4, z: -1.45 }),
  target: Object.freeze({ x: 0.75, y: 1.15, z: 2.55 }),
})
export const OPENING_FADE_DURATION_MS = 600
export const OPENING_GREETING_REVEAL_DELAY_MS = 350

export function shouldStartOpeningGreeting({
  classroomReady,
  greetingReady,
  greetingPlayed,
}) {
  return classroomReady && greetingReady && !greetingPlayed
}

export function positionOpeningAvatar(avatarRoot) {
  const { x, y, z } = CLASSROOM_OPENING_COMPOSITION.avatar
  avatarRoot.position.set(x, y, z)
}

export function positionOpeningCamera(camera) {
  const { camera: position, target } = CLASSROOM_OPENING_COMPOSITION
  camera.position.set(position.x, position.y, position.z)
  camera.lookAt(target.x, target.y, target.z)
}
