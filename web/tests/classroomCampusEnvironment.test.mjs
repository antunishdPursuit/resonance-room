import assert from 'node:assert/strict'
import test from 'node:test'
import * as THREE from 'three'
import {
  createCampusPlacement,
  createClassroomCampusEnvironment,
} from '../src/classroom/classroomCampusEnvironment.js'

function createRoomBounds() {
  return new THREE.Box3(
    new THREE.Vector3(-5, -0.3, -5),
    new THREE.Vector3(5, 3.24, 5),
  )
}

test('places the school wing beyond the classroom and the hallway beside it', () => {
  const roomBounds = createRoomBounds()
  const placement = createCampusPlacement(roomBounds)

  assert.ok(placement.building.frontX > roomBounds.max.x)
  assert.ok(placement.hallway.outerX < roomBounds.min.x)
  assert.equal(placement.building.floorHeight > 0, true)
  assert.equal(placement.hallway.doorZ.length, 2)
  assert.equal(placement.classroom.floorY, 0)
  assert.ok(
    placement.hallway.centerX + placement.hallway.width / 2
      > roomBounds.min.x,
  )
})

test('creates a non-playable scenery group with the planned landmarks', () => {
  const environment = createClassroomCampusEnvironment({
    roomBounds: createRoomBounds(),
  })

  assert.equal(environment.object3d.userData.playable, false)
  assert.ok(environment.object3d.getObjectByName('Blush sunrise sky'))
  assert.ok(environment.object3d.getObjectByName('Warm morning sun'))
  assert.ok(environment.object3d.getObjectByName('Courtyard school wing'))
  assert.ok(environment.object3d.getObjectByName('Upper and lower classroom windows'))
  assert.ok(environment.object3d.getObjectByName('Suggested hallway floor'))
  assert.ok(environment.object3d.getObjectByName('Hallway lockers'))
  assert.ok(environment.object3d.getObjectByName('Classroom rear wall'))
  assert.ok(environment.object3d.getObjectByName('Classroom ceiling and roof slab'))
  assert.ok(environment.object3d.getObjectByName('Closed hallway door'))
  assert.ok(environment.object3d.getObjectByName('Hallway doorway threshold'))
  assert.ok(environment.cameraBlockers.length >= 5)
  assert.deepEqual(environment.occlusionMeshes, environment.cameraBlockers)

  environment.dispose()
  assert.equal(environment.object3d.parent, null)
})
