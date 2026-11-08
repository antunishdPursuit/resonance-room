import assert from 'node:assert/strict'
import test from 'node:test'
import * as THREE from 'three'
import { createClassroomCampusEnvironment } from '../src/classroom/classroomCampusEnvironment.js'
import { completeClassroomCampusViews } from '../src/classroom/classroomCampusViews.js'
import { resolveCameraPosition } from '../src/classroom/avatarMovementController.js'

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
