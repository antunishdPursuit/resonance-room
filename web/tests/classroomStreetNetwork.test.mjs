import assert from 'node:assert/strict'
import test from 'node:test'
import * as THREE from 'three'
import { createClassroomCampusEnvironment } from '../src/classroom/classroomCampusEnvironment.js'
import { createClassroomStreetNetwork } from '../src/classroom/classroomStreetNetwork.js'

const overlaps = (a, b) =>
  Math.abs(a.x - b.x) < (a.width + b.width) / 2 - 0.001 &&
  Math.abs(a.z - b.z) < (a.length + b.length) / 2 - 0.001

for (const length of [10, 16]) {
  test(`both ends have four unobstructed approaches for a ${length}m classroom`, () => {
    const bounds = new THREE.Box3(
      new THREE.Vector3(-4, -0.3, -length / 2),
      new THREE.Vector3(4.76, 3.24, length / 2),
    )
    const campus = createClassroomCampusEnvironment({ roomBounds: bounds })
    const network = createClassroomStreetNetwork(campus)
    const { streets, buildings, sidewalks, junctions, roadWidth, roadX } = network.layout
    assert.equal(junctions.length, 2)
    assert.ok(junctions[0] < bounds.min.z && junctions[1] > bounds.max.z)
    assert.equal(streets.length, 3)
    for (const building of buildings) {
      const lot = { ...building, length: building.depth }
      streets.forEach((road) => assert.equal(overlaps(lot, road), false, 'Building blocks a road'))
      assert.equal(
        overlaps(lot, {
          x: bounds.getCenter(new THREE.Vector3()).x,
          z: 0,
          width: bounds.max.x - bounds.min.x,
          length,
        }),
        false,
        'Building intersects classroom',
      )
      sidewalks.forEach(([x, z, width, depth]) =>
        assert.equal(
          overlaps(lot, { x, z, width, length: depth }),
          false,
          'Building covers sidewalk',
        ),
      )
    }
    sidewalks.forEach(([x, z, width, depth]) =>
      streets.forEach((road) =>
        assert.equal(
          overlaps({ x, z, width, length: depth }, road),
          false,
          'Sidewalk blocks approach',
        ),
      ),
    )
    const facades = network.object3d.getObjectByName('Neighborhood corner buildings')
    // The lot beside the far corner closes the street-level gap from the left window.
    for (const offset of [13.5, 15, 17]) {
      const origin = new THREE.Vector3(bounds.max.x - 0.45, 1.65, -3.4)
      const target = new THREE.Vector3(roadX + offset, 1.65, junctions[0] - 8.1)
      const ray = new THREE.Raycaster(origin, target.sub(origin).normalize(), 0, 40)
      assert.ok(ray.intersectObject(facades).length > 0, 'Street-level gap exposes the sky')
    }
    for (const z of junctions) {
      // Facing each junction, the stop bar belongs to the incoming right-hand lane.
      for (const side of [-1, 1]) {
        const bars = network.layout.markings
        const mainBar = bars.find(
          (m) => Math.abs(m[1] - z - side * (roadWidth / 2 + 2.25)) < 0.001 && m[3] === 0.12,
        )
        const crossBar = bars.find(
          (m) =>
            Math.abs(m[0] - roadX - side * (roadWidth / 2 + 2.25)) < 0.001 &&
            Math.abs(m[1] - z) < roadWidth / 2 &&
            m[2] === 0.12,
        )
        assert.ok(
          mainBar && (mainBar[0] - roadX) * side > 0,
          'Main stop bar is on the outgoing lane',
        )
        assert.ok(
          crossBar && (crossBar[1] - z) * side < 0,
          'Cross-street stop bar is on the outgoing lane',
        )
      }
      for (const [dx, dz] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const ray = new THREE.Raycaster(
          new THREE.Vector3(roadX, 1.5, z),
          new THREE.Vector3(dx, 0, dz),
          0,
          25,
        )
        assert.equal(ray.intersectObject(facades).length, 0, 'An approach ends at a facade')
      }
      assert.ok(streets[0].length / 2 > Math.abs(z) + roadWidth)
    }
    const ground = new THREE.Box3().setFromObject(
      campus.object3d.getObjectByName('School courtyard ground'),
    )
    const scenery = new THREE.Box3().setFromObject(network.object3d)
    assert.ok(ground.min.x <= scenery.min.x && ground.max.x >= scenery.max.x)
    assert.ok(ground.min.z <= scenery.min.z && ground.max.z >= scenery.max.z)
    let disposed = 0
    facades.geometry.addEventListener('dispose', () => disposed++)
    network.dispose()
    assert.equal(network.object3d.parent, null)
    assert.equal(disposed, 1)
    assert.equal(campus.object3d.getObjectByName('Campus access road').visible, true)
    assert.deepEqual(
      campus.object3d.getObjectByName('School courtyard ground').scale.toArray(),
      [1, 1, 1],
    )
    campus.dispose()
  })
}
