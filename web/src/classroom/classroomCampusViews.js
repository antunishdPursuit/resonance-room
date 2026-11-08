import * as THREE from 'three'
import { CAMPUS_ENVIRONMENT_PALETTE as palette } from './classroomCampusEnvironment.js'

// Extend the retained campus without changing its walkable area or camera enclosure.
export function completeClassroomCampusViews(campus) {
  const object3d = new THREE.Group()
  object3d.name = 'Classroom windows and courtyard returns'
  object3d.userData.playable = false
  const geometries = new Set()
  const materials = new Set()
  const instances = []
  const cube = new THREE.BoxGeometry(1, 1, 1)
  geometries.add(cube)
  const surface = (color, options = {}) => {
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...options })
    materials.add(material)
    return material
  }
  const wall = surface(palette.classroomWall)
  const trim = surface(palette.trim)
  const facade = surface(palette.building)
  const roof = surface(palette.buildingShadow)
  const glass = surface(palette.window, { transparent: true, opacity: 0.22, depthWrite: false })
  const exteriorGlass = surface(palette.window, {
    emissive: palette.windowGlow,
    emissiveIntensity: 0.16,
  })
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

  const { classroom: room, building } = campus.placement
  const oldWall = campus.object3d.getObjectByName('Classroom left front wall')
  const originalVisibility = oldWall?.visible
  if (oldWall) {
    // Retain the original full wall as the camera boundary, while rendering real openings.
    oldWall.visible = false
    const start = room.door.centerZ + room.door.width / 2
    const end = room.frontZ
    const length = end - start
    const count = Math.max(1, Math.floor(length / 2.2))
    const bay = length / count
    const width = bay * 0.72
    const bottom = room.floorY + 1.75
    const top = Math.min(room.floorY + 2.8, room.ceilingY - 0.18)
    const middle = (bottom + top) / 2
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
      const pierWidth = (bay - width) * (i === 0 || i === count ? 0.5 : 1)
      const z =
        i === 0 ? start + pierWidth / 2 : i === count ? end - pierWidth / 2 : start + i * bay
      box(
        `Corridor window pier ${i}`,
        [room.wallThickness, top - bottom, pierWidth],
        [room.leftX, middle, z],
        wall,
      )
    }
    for (let i = 0; i < count; i++) {
      const z = start + bay * (i + 0.5)
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

  // Return wings meet the opposite facade at both ends, enclosing every lateral street view.
  const minX = room.leftX + room.width - 2
  const maxX = building.position[0] + 0.3
  const wingWidth = maxX - minX
  const wingDepth = 3.6
  const centerX = (minX + maxX) / 2
  const windowMatrices = []
  const transform = new THREE.Object3D()
  for (const side of [-1, 1]) {
    const innerZ = building.position[2] + side * (building.width / 2 - 0.3)
    box(
      `Courtyard return building ${side}`,
      [wingWidth, building.height, wingDepth],
      [centerX, building.position[1], innerZ + (side * wingDepth) / 2],
      facade,
    )
    box(
      `Courtyard return roof ${side}`,
      [wingWidth + 0.3, 0.28, wingDepth + 0.3],
      [centerX, building.baseY + building.height + 0.14, innerZ + (side * wingDepth) / 2],
      roof,
    )
    for (let row = 0; row < 3; row++) {
      if (row > 0) {
        box(
          `Courtyard return floor band ${side}-${row}`,
          [wingWidth, 0.16, 0.12],
          [centerX, building.baseY + row * building.floorHeight, innerZ - side * 0.03],
          trim,
        )
      }
      const columns = Math.max(2, Math.floor(wingWidth / 1.8))
      for (let column = 0; column < columns; column++) {
        transform.position.set(
          minX + ((column + 0.5) * wingWidth) / columns,
          building.baseY + 1.15 + row * building.floorHeight,
          innerZ - side * 0.06,
        )
        transform.scale.set(1.12, 1.15, 0.09)
        transform.updateMatrix()
        windowMatrices.push(transform.matrix.clone())
      }
    }
  }
  const windows = new THREE.InstancedMesh(cube, exteriorGlass, windowMatrices.length)
  windows.name = 'Courtyard return windows'
  windowMatrices.forEach((matrix, i) => windows.setMatrixAt(i, matrix))
  windows.instanceMatrix.needsUpdate = true
  instances.push(windows)
  object3d.add(windows)
  campus.object3d.add(object3d)
  campus.object3d.updateMatrixWorld(true)

  return {
    object3d,
    dispose() {
      object3d.removeFromParent()
      if (oldWall) oldWall.visible = originalVisibility
      if (ground) ground.scale.copy(originalGroundScale)
      instances.forEach((mesh) => mesh.dispose())
      geometries.forEach((geometry) => geometry.dispose())
      materials.forEach((material) => material.dispose())
    },
  }
}
