import * as THREE from 'three'
import { CAMPUS_ENVIRONMENT_PALETTE as palette } from './classroomCampusEnvironment.js'

export function createStreetLayout({ classroom, building, road }) {
  const x = road.centerX
  const half = road.width / 2
  const junctions = [-1, 1].map((side) => road.centerZ + side * (building.width / 2 + 7.5))
  const extent = building.width / 2 + 100
  const streets = [{ x, z: road.centerZ, width: road.width, length: extent * 2 }]
  const sidewalks = []
  const markings = []
  const buildings = []
  const walk = 0.8
  const intervals = [
    [road.centerZ - extent, junctions[0] - half],
    [junctions[0] + half, junctions[1] - half],
    [junctions[1] + half, road.centerZ + extent],
  ]
  for (const side of [-1, 1]) {
    intervals.forEach(([a, b]) =>
      sidewalks.push([x + side * (half + walk / 2), (a + b) / 2, walk, b - a]),
    )
  }
  for (const z of junctions) {
    streets.push({ x, z, width: 192, length: road.width })
    for (const side of [-1, 1]) {
      for (const [a, b] of [
        [x - 96, x - half],
        [x + half, x + 96],
      ]) {
        sidewalks.push([(a + b) / 2, z + side * (half + walk / 2), b - a, walk])
      }
      for (let stripe = 0; stripe < 6; stripe++) {
        const offset = side * (half + 0.45 + stripe * 0.28)
        markings.push([x, z + offset, road.width - 0.4, 0.12])
        markings.push([x + offset, z, 0.12, road.width - 0.4])
      }
      markings.push([x + (side * half) / 2, z + side * (half + 2.25), half - 0.25, 0.12])
      markings.push([x + side * (half + 2.25), z - (side * half) / 2, 0.12, half - 0.25])
      for (const quadrant of [-1, 1]) {
        buildings.push({
          x: x + side * (half + walk + 2 + 4),
          z: z + quadrant * (half + walk + 2 + 3),
          width: 8,
          depth: 6,
          height: 5.4 + (buildings.length % 3) * 1.2,
        })
      }
    }
  }
  for (let z = road.centerZ - extent + 1; z < road.centerZ + extent; z += 2) {
    if (junctions.every((j) => Math.abs(j - z) > half + 3.5)) markings.push([x, z, 0.08, 0.8])
  }
  for (const z of junctions) {
    for (let dx = -95; dx < 96; dx += 2) {
      if (Math.abs(dx) > half + 3.5) markings.push([x + dx, z, 0.8, 0.08])
    }
  }
  // Background blocks sit beside the road, leaving its vanishing point open.
  for (const end of [-1, 1]) {
    for (const side of [-1, 1])
      buildings.push({
        x: x + side * (half + 7),
        z: road.centerZ + end * (building.width / 2 + 27),
        width: 7,
        depth: 7,
        height: 4.8 + (side + 1) * 1.2,
      })
  }
  buildings.push({
    x: x + half + walk + 14,
    z: junctions[0] - (half + walk + 5),
    width: 8,
    depth: 6,
    height: 6.6,
  })
  return {
    streets,
    sidewalks,
    markings,
    buildings,
    junctions,
    roadX: x,
    roadWidth: road.width,
    floorY: classroom.floorY,
  }
}

export function createClassroomStreetNetwork(campus) {
  const layout = createStreetLayout(campus.placement)
  const object3d = new THREE.Group()
  object3d.name = 'Open school neighborhood'
  object3d.userData.playable = false
  const cube = new THREE.BoxGeometry(1, 1, 1)
  const canopy = new THREE.SphereGeometry(1, 8, 6)
  const resources = []
  const batch = (name, color, boxes, geometry = cube) => {
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.88 })
    const mesh = new THREE.InstancedMesh(geometry, material, boxes.length)
    mesh.name = name
    const transform = new THREE.Object3D()
    boxes.forEach(([x, y, z, width, height, depth], index) => {
      transform.position.set(x, y, z)
      transform.scale.set(width, height, depth)
      transform.updateMatrix()
      mesh.setMatrixAt(index, transform.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    object3d.add(mesh)
    resources.push({ mesh, material })
  }
  const floor = layout.floorY
  batch(
    'Connected neighborhood roads',
    palette.road,
    layout.streets.map((s) => [s.x, floor - 0.035, s.z, s.width, 0.08, s.length]),
  )
  batch(
    'Corner sidewalks',
    palette.roadEdge,
    layout.sidewalks.map(([x, z, w, d]) => [x, floor + 0.035, z, w, 0.14, d]),
  )
  batch(
    'Intersection crossings and lane markings',
    palette.crosswalk,
    layout.markings.map(([x, z, w, d]) => [x, floor + 0.018, z, w, 0.018, d]),
  )
  batch(
    'Neighborhood corner buildings',
    palette.building,
    layout.buildings.map((b) => [b.x, floor + b.height / 2, b.z, b.width, b.height, b.depth]),
  )
  batch(
    'Neighborhood rooflines',
    palette.buildingShadow,
    layout.buildings.map((b) => [
      b.x,
      floor + b.height + 0.1,
      b.z,
      b.width + 0.2,
      0.2,
      b.depth + 0.2,
    ]),
  )
  const windows = [],
    bands = []
  for (const b of layout.buildings) {
    for (let level = 0; level < Math.floor(b.height / 2); level++) {
      const y = floor + 1.15 + level * 2
      for (const side of [-1, 1]) {
        for (let column = -1; column <= 1; column++) {
          windows.push([b.x + column * 2, y, b.z + side * (b.depth / 2 + 0.025), 1.1, 1, 0.05])
          windows.push([b.x + side * (b.width / 2 + 0.025), y, b.z + column * 1.6, 0.05, 1, 0.9])
        }
        bands.push([b.x, y + 0.7, b.z + side * (b.depth / 2 + 0.02), b.width, 0.1, 0.05])
        bands.push([b.x + side * (b.width / 2 + 0.02), y + 0.7, b.z, 0.05, 0.1, b.depth])
      }
    }
  }
  batch('Neighborhood windows', palette.window, windows)
  batch('Neighborhood floor bands', palette.trim, bands)
  const trees = []
  for (const z of layout.junctions) {
    for (const side of [-1, 1]) {
      for (const end of [-1, 1]) {
        trees.push([
          layout.roadX + side * (layout.roadWidth / 2 + 1.8),
          z + end * (layout.roadWidth / 2 + 1.8),
        ])
      }
    }
  }
  batch(
    'Corner tree trunks',
    palette.treeTrunk,
    trees.map(([x, z]) => [x, floor + 1.1, z, 0.12, 2.2, 0.12]),
  )
  batch(
    'Corner tree crowns',
    palette.treeLeaf,
    trees.map(([x, z]) => [x, floor + 2.5, z, 0.65, 0.8, 0.65]),
    canopy,
  )
  const hidden = [
    'Campus access road',
    'Roadside sidewalks',
    'Road center dashes',
    'Classroom crosswalk',
  ]
    .map((name) => campus.object3d.getObjectByName(name))
    .filter(Boolean)
    .map((mesh) => ({ mesh, visible: mesh.visible }))
  hidden.forEach(({ mesh }) => {
    mesh.visible = false
  })
  const ground = campus.object3d.getObjectByName('School courtyard ground')
  const originalScale = ground?.scale.clone()
  ground?.scale.setScalar(9)
  campus.object3d.add(object3d)
  campus.object3d.updateMatrixWorld(true)
  return {
    object3d,
    layout,
    dispose() {
      object3d.removeFromParent()
      hidden.forEach(({ mesh, visible }) => {
        mesh.visible = visible
      })
      if (ground) ground.scale.copy(originalScale)
      resources.forEach(({ mesh, material }) => {
        mesh.dispose()
        material.dispose()
      })
      cube.dispose()
      canopy.dispose()
    },
  }
}
