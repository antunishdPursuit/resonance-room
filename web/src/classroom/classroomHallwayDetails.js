import * as THREE from 'three'
import { CAMPUS_ENVIRONMENT_PALETTE as palette } from './classroomCampusEnvironment.js'

export function createClassroomHallwayDetails(campus) {
  const object3d = new THREE.Group()
  object3d.name = 'Finished school corridor'
  const cube = new THREE.BoxGeometry(1, 1, 1)
  const batches = new Map()
  const surfaces = new Map()
  const material = (name, color, options = {}) => {
    const surface = new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...options })
    surfaces.set(name, surface)
    batches.set(name, [])
    return name
  }
  const wall = material('Hallway structure', palette.hallwayWall)
  const wood = material('Hallway wood', palette.hallwayFloor)
  const ceiling = material('Hallway ceiling', palette.hallwayCeiling)
  const trim = material('Hallway trim', palette.trim)
  const cream = material('Hallway paper and fixtures', 0xd4c5ab)
  const plum = material('Hallway notices', palette.locker)
  const glow = material('Hallway fixture panels', 0xfff3da, {
    emissive: 0xffe4bf,
    emissiveIntensity: 0.3,
  })
  const glass = material('Hallway exit glazing', palette.window, {
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
  })
  const box = (surface, size, position, rotation = 0) =>
    batches.get(surface).push({ size, position, rotation })
  const { hallway: h, classroom: room } = campus.placement
  const hidden = ['Suggested hallway outer wall', 'Hallway end wall']
    .map((name) => campus.object3d.getObjectByName(name))
    .filter(Boolean)
  const visibility = hidden.map((mesh) => mesh.visible)
  hidden.forEach((mesh) => {
    mesh.visible = false
  })
  const rearZ = h.centerZ - h.length / 2
  const turnDepth = 2.3
  const returnWidth = 2.8
  const mainLength = h.length - turnDepth
  // The far end turns beyond the original outer wall into a short enclosed wing.
  box(wall, [0.16, h.height, mainLength], [h.outerX, h.height / 2, rearZ + mainLength / 2])
  box(
    wood,
    [returnWidth + 0.16, 0.12, turnDepth],
    [h.outerX - returnWidth / 2, -0.04, h.endZ - turnDepth / 2],
  )
  box(
    ceiling,
    [returnWidth + 0.16, 0.14, turnDepth],
    [h.outerX - returnWidth / 2, h.height, h.endZ - turnDepth / 2],
  )
  box(
    wall,
    [h.width + returnWidth, h.height, 0.16],
    [h.centerX - returnWidth / 2, h.height / 2, h.endZ],
  )
  box(
    wall,
    [returnWidth, h.height, 0.16],
    [h.outerX - returnWidth / 2, h.height / 2, h.endZ - turnDepth],
  )
  box(
    wall,
    [0.16, h.height, turnDepth],
    [h.outerX - returnWidth, h.height / 2, h.endZ - turnDepth / 2],
  )
  // A mounted left arrow and music bars identify the bend from the window,
  // without putting a freestanding object in the corridor return.
  const signX = h.outerX + 2.4
  box(wood, [1.3, 0.56, 0.025], [signX, 1.75, h.endZ - 0.09])
  box(cream, [1.2, 0.46, 0.025], [signX, 1.75, h.endZ - 0.115])
  box(plum, [0.42, 0.045, 0.012], [signX - 0.22, 1.75, h.endZ - 0.1335])
  for (const direction of [-1, 1])
    box(
      plum,
      [0.19, 0.045, 0.012],
      [signX - 0.36, 1.75 + direction * 0.06, h.endZ - 0.1335],
      (direction * Math.PI) / 4,
    )
  for (let i = 0; i < 3; i++)
    box(
      plum,
      [0.055, 0.11 + i * 0.055, 0.012],
      [signX + 0.15 + i * 0.11, 1.71 + i * 0.0275, h.endZ - 0.1335],
    )
  // The opposite end is enclosed around an intentional glazed exit.
  const opening = 1.3
  const pierWidth = (h.width - opening) / 2
  for (const direction of [-1, 1]) {
    box(
      wall,
      [pierWidth, h.height, 0.16],
      [h.centerX + direction * (opening / 2 + pierWidth / 2), h.height / 2, rearZ],
    )
    box(trim, [0.09, 2.3, 0.2], [h.centerX + (direction * opening) / 2, 1.15, rearZ + 0.02])
  }
  box(wall, [opening, h.height - 2.3, 0.16], [h.centerX, (h.height + 2.3) / 2, rearZ])
  for (const y of [0.06, 1.1, 2.25]) box(trim, [opening, 0.09, 0.2], [h.centerX, y, rearZ + 0.02])
  box(glass, [opening - 0.08, 2.17, 0.035], [h.centerX, 1.155, rearZ])
  box(cream, [0.38, 0.035, 0.055], [h.centerX + 0.23, 1.12, rearZ + 0.15])
  // Consistent skirting, room jambs and ceiling fixtures connect the whole hall.
  box(trim, [0.05, 0.13, mainLength], [h.outerX + 0.1, 0.065, rearZ + mainLength / 2])
  box(trim, [0.05, 0.13, h.length], [room.leftX - 0.11, 0.065, h.centerZ])
  box(trim, [h.width + returnWidth, 0.13, 0.05], [h.centerX - returnWidth / 2, 0.065, h.endZ - 0.1])
  for (const z of h.doorZ) {
    for (const direction of [-1, 1])
      box(trim, [0.08, 2.25, 0.07], [h.outerX + 0.19, 1.125, z + direction * 0.63])
    box(trim, [0.08, 0.07, 1.33], [h.outerX + 0.19, 2.25, z])
    box(cream, [0.07, 0.04, 0.17], [h.outerX + 0.23, 1.04, z + 0.4])
  }
  for (let z = rearZ + 1; z < h.endZ - 0.5; z += 3) {
    box(trim, [0.65, 0.06, 0.9], [h.centerX, h.height - 0.1, z])
    box(glow, [0.56, 0.025, 0.8], [h.centerX, h.height - 0.145, z])
  }
  box(trim, [0.07, 0.85, 2.3], [h.outerX + 0.13, 2.22, h.centerZ])
  box(plum, [0.025, 0.75, 2.2], [h.outerX + 0.18, 2.22, h.centerZ])
  for (let i = 0; i < 5; i++)
    box(
      cream,
      [0.015, 0.43 + (i % 2) * 0.08, 0.28],
      [h.outerX + 0.2, 2.22, h.centerZ - 0.85 + i * 0.42],
    )
  const benchZ = h.endZ - turnDepth - 0.85
  box(wood, [0.43, 0.08, 1.25], [h.outerX + 0.34, 0.46, benchZ])
  box(wood, [0.06, 0.38, 1.25], [h.outerX + 0.14, 0.69, benchZ])
  for (const dz of [-0.48, 0.48]) box(trim, [0.3, 0.42, 0.06], [h.outerX + 0.34, 0.21, benchZ + dz])
  // Fit the existing closed leaf; recessed stops back its six-millimetre reveal.
  const door = campus.object3d.getObjectByName('Closed hallway door')
  const originalScale = door?.scale.clone()
  if (door) {
    door.scale.y *= (room.door.height - 0.012) / room.door.height
    door.scale.z *= (room.door.width - 0.012) / (room.door.width - 0.1)
  }
  for (const direction of [-1, 1])
    box(
      trim,
      [0.06, room.door.height, 0.06],
      [
        room.leftX + 0.015,
        room.door.height / 2,
        room.door.centerZ + direction * (room.door.width / 2 - 0.015),
      ],
    )
  box(
    trim,
    [0.06, 0.06, room.door.width],
    [room.leftX + 0.015, room.door.height - 0.015, room.door.centerZ],
  )
  const transform = new THREE.Object3D()
  for (const [name, parts] of batches) {
    const mesh = new THREE.InstancedMesh(cube, surfaces.get(name), parts.length)
    mesh.name = name
    parts.forEach(({ size, position, rotation }, index) => {
      transform.position.set(position[0], position[1] + h.baseY, position[2])
      transform.scale.set(...size)
      transform.rotation.set(0, 0, rotation)
      transform.updateMatrix()
      mesh.setMatrixAt(index, transform.matrix)
    })
    object3d.add(mesh)
  }
  object3d.updateMatrixWorld(true)
  return {
    object3d,
    dispose() {
      hidden.forEach((mesh, i) => {
        mesh.visible = visibility[i]
      })
      if (door) door.scale.copy(originalScale)
      object3d.removeFromParent()
      object3d.children.forEach((mesh) => mesh.dispose())
      cube.dispose()
      surfaces.forEach((surface) => surface.dispose())
    },
  }
}
