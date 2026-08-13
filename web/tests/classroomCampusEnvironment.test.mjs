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

test('places the school wing, road, and hallway around the classroom', () => {
  const roomBounds = createRoomBounds()
  const placement = createCampusPlacement(roomBounds)

  assert.ok(placement.building.frontX > roomBounds.max.x)
  assert.ok(placement.road.centerX > roomBounds.max.x)
  assert.ok(placement.road.centerX < placement.building.frontX)
  assert.ok(placement.road.width >= 3.8)
  assert.equal(placement.road.sidewalkX.length, 2)
  assert.equal(placement.road.lampPositions.length, 4)
  assert.equal(placement.windowView.treePositions.length, 2)
  assert.ok(
    placement.windowView.treePositions[1][0]
      > placement.windowView.treePositions[0][0],
  )
  assert.ok(
    placement.windowView.treePositions[0][1]
      < placement.windowView.treePositions[1][1],
  )
  assert.equal(placement.windowView.shrubPositions.length, 3)
  assert.ok(placement.hallway.outerX < roomBounds.min.x)
  assert.equal(placement.building.floorHeight > 0, true)
  assert.equal(placement.hallway.doorZ.length, 2)
  assert.equal(placement.classroom.floorY, 0)
  assert.ok(
    placement.hallway.centerX + placement.hallway.width / 2
      > roomBounds.min.x,
  )
})

test('spans the full window wall when the classroom is longer than it is wide', () => {
  const roomBounds = new THREE.Box3(
    new THREE.Vector3(-4, -0.3, -8),
    new THREE.Vector3(4, 3.24, 8),
  )
  const placement = createCampusPlacement(roomBounds)

  assert.ok(placement.building.width >= 28)
  assert.ok(placement.building.width > roomBounds.getSize(new THREE.Vector3()).z)
  assert.ok(placement.road.length >= placement.building.width - 1.5)
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
  assert.ok(environment.object3d.getObjectByName('Campus access road'))
  assert.ok(environment.object3d.getObjectByName('Roadside sidewalks'))
  assert.ok(environment.object3d.getObjectByName('Road center dashes'))
  assert.ok(environment.object3d.getObjectByName('Classroom crosswalk'))
  assert.ok(environment.object3d.getObjectByName('Road lamp posts'))
  assert.ok(environment.object3d.getObjectByName('Road lamp lights'))
  assert.ok(environment.object3d.getObjectByName('Window-side tree canopies'))
  assert.ok(environment.object3d.getObjectByName('Window-side shrubs'))
  assert.ok(environment.object3d.getObjectByName('Sidewalk bench seat'))
  assert.ok(environment.object3d.getObjectByName('Music school sign face'))
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
