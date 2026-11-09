import assert from 'node:assert/strict'
import test from 'node:test'
import * as THREE from 'three'
import { classroomFixture } from './classroomSourceFixture.mjs'
import { applyClassroomLayout } from '../src/classroom/classroomLayout.js'
import { createClassroomMovementEnvironment } from '../src/classroom/classroomMovementEnvironment.js'
import { createAvatarMovementController } from '../src/classroom/avatarMovementController.js'

test('fresh source expands around sixteen unchanged desk/chair units and restores all source assets', () => {
  const { root, parser } = classroomFixture()
  const states = root.children.map((mesh) => [
    mesh,
    mesh.geometry,
    mesh.position.clone(),
    new THREE.Box3().setFromObject(mesh),
  ])
  const layout = applyClassroomLayout(root, parser)
  const environment = createClassroomMovementEnvironment({ classroomRoot: root, parser })
  assert.equal(environment.deskZones.length, 16)
  for (const [mesh, geometry, , bounds] of states.filter(([mesh]) =>
    [18, 19, 50].includes(parser.associations.get(mesh).nodes),
  )) {
    assert.equal(mesh.geometry, geometry)
    assert.deepEqual(new THREE.Box3().setFromObject(mesh), bounds)
  }
  const desks = new THREE.Box3()
  environment.deskZones.forEach((zone) => desks.union(zone.bounds))
  assert.ok(desks.min.x - environment.walkableBounds.min.x > 1.3)
  const curtain = environment.structuralObstacles.find(
    (item) => item.id === 'right-window-curtain-boundary',
  )
  assert.ok(curtain.bounds.min.x - desks.max.x > 1.4)
  layout.dispose()
  for (const [mesh, geometry, position, bounds] of states) {
    assert.equal(mesh.geometry, geometry)
    assert.deepEqual(mesh.position, position)
    assert.deepEqual(new THREE.Box3().setFromObject(mesh), bounds)
  }
})

test('actual movement controller walks both side aisles, rear entrance and front teaching route', () => {
  const { root, parser } = classroomFixture()
  const layout = applyClassroomLayout(root, parser)
  const environment = createClassroomMovementEnvironment({ classroomRoot: root, parser })
  const previousWindow = globalThis.window
  globalThis.window = { addEventListener() {}, removeEventListener() {} }
  try {
    // Each route is sampled by the production movement resolver at normal walk speed.
    for (const [start, end] of [
      [
        [-4.1, -4.4],
        [-4.1, 3.5],
      ],
      [
        [4.2, -4.4],
        [4.2, 3.5],
      ],
      [
        [-4.1, -4.4],
        [4.2, -4.4],
      ],
      [
        [-4.1, 2.4],
        [4.2, 2.4],
      ],
    ]) {
      const avatarRoot = new THREE.Group()
      avatarRoot.position.set(start[0], 0, start[1])
      const camera = new THREE.PerspectiveCamera()
      camera.position.set(start[0], 1.15, start[1] + 4)
      const controller = createAvatarMovementController({
        avatarRoot,
        camera,
        canvas: { addEventListener() {}, removeEventListener() {} },
        environment,
      })
      const direction = new THREE.Vector2(end[0] - start[0], end[1] - start[1])
      const distance = direction.length()
      direction.normalize()
      controller.setTouchMovement(direction.x, -direction.y)
      for (let i = 0; i < Math.ceil((distance / 1.35) * 60); i++) controller.update(1 / 60)
      assert.ok(
        Math.hypot(avatarRoot.position.x - end[0], avatarRoot.position.z - end[1]) < 0.04,
        `Blocked route ${start} to ${end}`,
      )
      controller.dispose()
    }
  } finally {
    globalThis.window = previousWindow
    layout.dispose()
  }
})
