import assert from 'node:assert/strict'
import test from 'node:test'
import * as THREE from 'three'
import { createClassroomCampusEnvironment } from '../src/classroom/classroomCampusEnvironment.js'
import { completeClassroomCampusViews } from '../src/classroom/classroomCampusViews.js'
import { resolveCameraPosition } from '../src/classroom/avatarMovementController.js'

for (const halfLength of [5, 8]) {
  test(`buildings cover street-level views from both ends of a ${halfLength * 2}m room`, () => {
    const bounds = new THREE.Box3(
      new THREE.Vector3(-4, -0.3, -halfLength),
      new THREE.Vector3(4.76, 3.24, halfLength),
    )
    const campus = createClassroomCampusEnvironment({ roomBounds: bounds })
    const views = completeClassroomCampusViews(campus)
    const buildings = [
      campus.object3d.getObjectByName('Courtyard school wing'),
      ...views.object3d.children.filter((mesh) =>
        mesh.name.startsWith('Courtyard return building'),
      ),
    ]
    const ray = new THREE.Raycaster()
    for (const z of [-halfLength + 0.4, 0, halfLength - 0.4]) {
      for (const y of [0.2, 1.5, 2.7, 5.5]) {
        for (const degrees of [-89, -75, -45, 0, 45, 75, 89]) {
          const angle = THREE.MathUtils.degToRad(degrees)
          ray.set(
            new THREE.Vector3(bounds.max.x - 0.35, y, z),
            new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)),
          )
          assert.ok(
            ray.intersectObjects(buildings, false).length,
            `Missing facade at z=${z}, y=${y}, angle=${degrees}`,
          )
        }
      }
    }
    // A steep upward look remains sky rather than a solid enclosure overhead.
    ray.set(new THREE.Vector3(bounds.max.x - 0.35, 1.5, 0), new THREE.Vector3(1, 4, 0).normalize())
    assert.equal(ray.intersectObjects(buildings, false).length, 0)
    const ground = new THREE.Box3().setFromObject(
      campus.object3d.getObjectByName('School courtyard ground'),
    )
    buildings.forEach((mesh) => {
      const box = new THREE.Box3().setFromObject(mesh)
      assert.ok(ground.min.x <= box.min.x && ground.max.x >= box.max.x)
      assert.ok(ground.min.z <= box.min.z && ground.max.z >= box.max.z)
    })
    views.dispose()
    campus.dispose()
  })
}

test('corridor windows have real openings above furniture while retaining camera containment', () => {
  const campus = createClassroomCampusEnvironment({
    roomBounds: new THREE.Box3(new THREE.Vector3(-4, -0.3, -5), new THREE.Vector3(4.76, 3.24, 5)),
  })
  const oldWall = campus.object3d.getObjectByName('Classroom left front wall')
  const views = completeClassroomCampusViews(campus)
  const panes = views.object3d.children.filter((mesh) =>
    mesh.name.startsWith('Corridor window glass'),
  )
  assert.ok(panes.length >= 2)
  for (const pane of panes) {
    const box = new THREE.Box3().setFromObject(pane)
    assert.ok(box.min.y >= 1.75)
    assert.ok(
      box.min.z >
        campus.placement.classroom.door.centerZ + campus.placement.classroom.door.width / 2,
    )
    const ray = new THREE.Raycaster(
      new THREE.Vector3(0, pane.position.y, pane.position.z - 0.2),
      new THREE.Vector3(-1, 0, 0),
    )
    const hits = ray.intersectObjects(
      views.object3d.children.filter((mesh) => mesh.material !== pane.material),
      false,
    )
    assert.equal(hits.length, 0, 'Opaque geometry blocks the window opening')
  }
  assert.equal(oldWall.visible, false)
  const target = new THREE.Vector3(0, 2.1, panes[0].position.z)
  const desired = target.clone().setX(-6)
  const result = resolveCameraPosition({
    target,
    desiredPosition: desired,
    blockers: campus.cameraBlockers,
  })
  assert.ok(result.x > -4, 'Camera escaped through the corridor window')
  const ground = campus.object3d.getObjectByName('School courtyard ground')
  const geometry = panes[0].geometry
  const material = panes[0].material
  let disposedGeometry = 0
  let disposedMaterial = 0
  geometry.addEventListener('dispose', () => disposedGeometry++)
  material.addEventListener('dispose', () => disposedMaterial++)
  views.dispose()
  assert.equal(views.object3d.parent, null)
  assert.equal(oldWall.visible, true)
  assert.deepEqual(ground.scale.toArray(), [1, 1, 1])
  assert.equal(disposedGeometry, 1)
  assert.equal(disposedMaterial, 1)
  campus.dispose()
})
