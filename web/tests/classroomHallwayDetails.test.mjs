import assert from 'node:assert/strict'
import test from 'node:test'
import * as THREE from 'three'
import { createClassroomCampusEnvironment } from '../src/classroom/classroomCampusEnvironment.js'
import { completeClassroomCampusViews } from '../src/classroom/classroomCampusViews.js'

test('every corridor window has finished oblique sightlines and outside appears through exit glazing', () => {
  const campus = createClassroomCampusEnvironment({
    roomBounds: new THREE.Box3(
      new THREE.Vector3(-4.82, -0.3, -5.67),
      new THREE.Vector3(5.56, 3.24, 5.57),
    ),
  })
  const door = campus.object3d.getObjectByName('Closed hallway door')
  const originalScale = door.scale.clone()
  const end = campus.object3d.getObjectByName('Hallway end wall')
  const outer = campus.object3d.getObjectByName('Suggested hallway outer wall')
  const views = completeClassroomCampusViews(campus)
  const hallway = views.object3d.getObjectByName('Finished school corridor')
  assert.equal(
    hallway.children.length,
    8,
    'Detail geometry must remain in shared instanced batches',
  )
  const panes = views.object3d.children.filter((mesh) =>
    mesh.name.startsWith('Corridor window glass'),
  )
  for (const pane of panes) {
    for (const direction of [-1, 1]) {
      const ray = new THREE.Raycaster(
        new THREE.Vector3(pane.position.x + 0.5, 1.6, pane.position.z),
        new THREE.Vector3(-0.4, 0, direction).normalize(),
      )
      assert.ok(
        ray.intersectObjects(hallway.children).length,
        `Unfinished hallway sightline at ${pane.position.z}, direction ${direction}`,
      )
    }
  }
  const h = campus.placement.hallway
  const signRay = new THREE.Raycaster(
    new THREE.Vector3(h.outerX + 2, 1.57, h.endZ - 1),
    new THREE.Vector3(0, 0, 1),
  )
  const signHit = signRay.intersectObjects(hallway.children)[0]
  assert.equal(
    signHit.object.name,
    'Hallway paper and fixtures',
    'The visible return end needs its mounted wayfinding panel',
  )
  assert.ok(Math.abs(signHit.point.z - (h.endZ - 0.1275)) < 0.00001)
  const exitRay = new THREE.Raycaster(
    new THREE.Vector3(h.centerX, 1.6, h.centerZ),
    new THREE.Vector3(0, 0, -1),
  )
  assert.equal(exitRay.intersectObjects(hallway.children)[0].object.name, 'Hallway exit glazing')
  const turnRay = new THREE.Raycaster(
    new THREE.Vector3(h.outerX + 0.5, 1.6, h.endZ - 1.15),
    new THREE.Vector3(-1, 0, 0),
  )
  assert.ok(
    turnRay.intersectObjects(hallway.children)[0].distance > 3,
    'The return is sealed across its opening',
  )
  const resources = new Set()
  hallway.children.forEach((mesh) => {
    resources.add(mesh)
    resources.add(mesh.geometry)
    resources.add(mesh.material)
  })
  let disposed = 0
  resources.forEach((resource) => resource.addEventListener('dispose', () => disposed++))
  assert.equal(end.visible, false)
  assert.equal(outer.visible, false)
  views.dispose()
  assert.equal(disposed, resources.size)
  assert.equal(end.visible, true)
  assert.equal(outer.visible, true)
  assert.deepEqual(door.scale, originalScale)
  campus.dispose()
})
