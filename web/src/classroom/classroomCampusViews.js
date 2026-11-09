import * as THREE from 'three'
import { CAMPUS_ENVIRONMENT_PALETTE as palette } from './classroomCampusEnvironment.js'
import { createClassroomStreetNetwork } from './classroomStreetNetwork.js'
import { createClassroomHallwayDetails } from './classroomHallwayDetails.js'

// Extend the retained campus without changing its walkable area or camera enclosure.
export function completeClassroomCampusViews(campus, { boardBottom = 0.9845305, frontWallZ } = {}) {
  const object3d = new THREE.Group()
  object3d.name = 'Classroom windows and courtyard returns'
  object3d.userData.playable = false
  const geometries = new Set()
  const materials = new Set()
  const cube = new THREE.BoxGeometry(1, 1, 1)
  geometries.add(cube)
  const surface = (color, options = {}) => {
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...options })
    materials.add(material)
    return material
  }
  const wall = surface(palette.classroomWall)
  const trim = surface(palette.trim)
  const glass = surface(palette.window, { transparent: true, opacity: 0.22, depthWrite: false })
  const box = (name, size, position, material) => {
    const mesh = new THREE.Mesh(cube, material)
    mesh.name = name
    mesh.scale.set(...size)
    mesh.position.set(...position)
    object3d.add(mesh)
    return mesh
  }
  const ground = campus.object3d.getObjectByName('School courtyard ground')
  const originalGroundScale = ground?.scale.clone()
  ground?.scale.multiplyScalar(1.8)

  const { classroom: room } = campus.placement
  const oldWall = campus.object3d.getObjectByName('Classroom left front wall')
  const originalVisibility = oldWall?.visible
  if (oldWall) {
    // Retain the original full wall as the camera boundary, while rendering real openings.
    oldWall.visible = false
    const start = room.door.centerZ + room.door.width / 2
    const end = frontWallZ ?? room.frontZ
    const length = end - start
    // The retained classroom fits three bays with 0.65m outer-frame returns;
    // smaller supplied bounds must still produce positive, contained geometry.
    const margin = Math.min(0.69, length * 0.15)
    const pier = Math.min(0.55, length * 0.1)
    const count = Math.min(3, Math.max(1, Math.floor((length - 2 * margin + pier) / 1.35)))
    const width = (length - 2 * margin - (count - 1) * pier) / count
    const bottom = boardBottom + 0.035
    const top = bottom + 1.05
    const middle = (bottom + top) / 2
    if (end < room.frontZ)
      box(
        'Corridor front corner return',
        [room.wallThickness, room.height, room.frontZ - end],
        [room.leftX, room.floorY + room.height / 2, (end + room.frontZ) / 2],
        wall,
      )
    box(
      'Corridor window lower wall',
      [room.wallThickness, bottom - room.floorY, length],
      [room.leftX, (room.floorY + bottom) / 2, (start + end) / 2],
      wall,
    )
    box(
      'Corridor window upper wall',
      [room.wallThickness, room.ceilingY - top, length],
      [room.leftX, (top + room.ceilingY) / 2, (start + end) / 2],
      wall,
    )
    for (let i = 0; i <= count; i++) {
      const pierWidth = i === 0 || i === count ? margin : pier
      const z =
        i === 0
          ? start + margin / 2
          : i === count
            ? end - margin / 2
            : start + margin + i * width + (i - 0.5) * pier
      box(
        `Corridor window pier ${i}`,
        [room.wallThickness, top - bottom, pierWidth],
        [room.leftX, middle, z],
        wall,
      )
    }
    for (let i = 0; i < count; i++) {
      const z = start + margin + width / 2 + i * (width + pier)
      box(
        `Corridor window glass ${i}`,
        [0.025, top - bottom, width],
        [room.leftX, middle, z],
        glass,
      )
      for (const y of [bottom, top]) {
        box(
          `Corridor window horizontal frame ${i}`,
          [0.24, 0.07, width + 0.08],
          [room.leftX, y, z],
          trim,
        )
      }
      for (const offset of [-width / 2, 0, width / 2]) {
        box(
          `Corridor window vertical frame ${i}`,
          [0.24, top - bottom, 0.055],
          [room.leftX, middle, z + offset],
          trim,
        )
      }
    }
  }

  const streets = createClassroomStreetNetwork(campus)
  const hallway = createClassroomHallwayDetails(campus)
  object3d.add(hallway.object3d)
  campus.object3d.add(object3d)
  campus.object3d.updateMatrixWorld(true)

  return {
    object3d,
    dispose() {
      streets.dispose()
      hallway.dispose()
      object3d.removeFromParent()
      if (oldWall) oldWall.visible = originalVisibility
      if (ground) ground.scale.copy(originalGroundScale)
      geometries.forEach((geometry) => geometry.dispose())
      materials.forEach((material) => material.dispose())
    },
  }
}
