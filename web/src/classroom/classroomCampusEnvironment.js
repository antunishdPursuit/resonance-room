import * as THREE from 'three'

export const CAMPUS_ENVIRONMENT_PALETTE = Object.freeze({
  skyTop: 0x6f66b8,
  skyHorizon: 0xffb4cf,
  skyLow: 0xffddad,
  sun: 0xfff0bd,
  grass: 0x526b55,
  building: 0xd8b7a8,
  buildingShadow: 0x6b4554,
  trim: 0x7a4659,
  window: 0x8bd4df,
  windowGlow: 0xffd9a6,
  hallwayFloor: 0x8b5a4a,
  hallwayWall: 0xe2c9bd,
  hallwayCeiling: 0xecdcd2,
  classroomWall: 0xc9bfbd,
  classroomCeiling: 0xb8b0af,
  door: 0x734456,
  locker: 0x7d6a91,
  accent: 0xff6fae,
})

const BUILDING_WINDOW_COLUMNS = 8
const BUILDING_WINDOW_ROWS = 3

function addMesh(group, geometry, material, {
  name,
  position,
  rotation,
}) {
  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = name
  mesh.position.set(...position)
  if (rotation) mesh.rotation.set(...rotation)
  group.add(mesh)
  return mesh
}

function createSkyMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(CAMPUS_ENVIRONMENT_PALETTE.skyTop) },
      horizonColor: { value: new THREE.Color(CAMPUS_ENVIRONMENT_PALETTE.skyHorizon) },
      lowColor: { value: new THREE.Color(CAMPUS_ENVIRONMENT_PALETTE.skyLow) },
    },
    vertexShader: `
      varying float skyHeight;

      void main() {
        skyHeight = normalize(position).y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 horizonColor;
      uniform vec3 lowColor;
      varying float skyHeight;

      void main() {
        float horizonMix = smoothstep(-0.35, 0.12, skyHeight);
        float topMix = smoothstep(0.05, 0.82, skyHeight);
        vec3 color = mix(lowColor, horizonColor, horizonMix);
        color = mix(color, topColor, topMix);
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  })
}

function createSun(group, placement, materials, geometries) {
  const sunGeometry = new THREE.CircleGeometry(1.15, 36)
  const sunMaterial = new THREE.MeshBasicMaterial({
    color: CAMPUS_ENVIRONMENT_PALETTE.sun,
    side: THREE.DoubleSide,
    toneMapped: false,
  })
  geometries.add(sunGeometry)
  materials.add(sunMaterial)

  const sun = addMesh(group, sunGeometry, sunMaterial, {
    name: 'Warm morning sun',
    position: placement.sun,
    rotation: [0, -Math.PI / 2, 0],
  })
  sun.renderOrder = -4

  const glowGeometry = new THREE.CircleGeometry(1.75, 36)
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: CAMPUS_ENVIRONMENT_PALETTE.skyHorizon,
    opacity: 0.22,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  })
  geometries.add(glowGeometry)
  materials.add(glowMaterial)
  const glow = addMesh(group, glowGeometry, glowMaterial, {
    name: 'Sun glow',
    position: [placement.sun[0] - 0.02, placement.sun[1], placement.sun[2]],
    rotation: [0, -Math.PI / 2, 0],
  })
  glow.renderOrder = -5
}

function createCourtyardSchool(group, placement, materials, geometries) {
  const standardMaterial = (color, options = {}) => {
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.82,
      metalness: 0,
      ...options,
    })
    materials.add(material)
    return material
  }

  const facadeMaterial = standardMaterial(CAMPUS_ENVIRONMENT_PALETTE.building)
  const shadowMaterial = standardMaterial(CAMPUS_ENVIRONMENT_PALETTE.buildingShadow)
  const trimMaterial = standardMaterial(CAMPUS_ENVIRONMENT_PALETTE.trim)
  const windowMaterial = standardMaterial(CAMPUS_ENVIRONMENT_PALETTE.window, {
    emissive: CAMPUS_ENVIRONMENT_PALETTE.windowGlow,
    emissiveIntensity: 0.16,
  })

  const facadeGeometry = new THREE.BoxGeometry(
    0.55,
    placement.building.height,
    placement.building.width,
  )
  geometries.add(facadeGeometry)
  addMesh(group, facadeGeometry, facadeMaterial, {
    name: 'Courtyard school wing',
    position: placement.building.position,
  })

  const roofGeometry = new THREE.BoxGeometry(
    0.9,
    0.28,
    placement.building.width + 0.7,
  )
  geometries.add(roofGeometry)
  addMesh(group, roofGeometry, shadowMaterial, {
    name: 'School wing roofline',
    position: [
      placement.building.position[0],
      placement.building.position[1] + placement.building.height / 2 + 0.14,
      placement.building.position[2],
    ],
  })

  const bandGeometry = new THREE.BoxGeometry(
    0.14,
    0.16,
    placement.building.width + 0.12,
  )
  geometries.add(bandGeometry)
  for (let floor = 1; floor < BUILDING_WINDOW_ROWS; floor += 1) {
    addMesh(group, bandGeometry, trimMaterial, {
      name: `School floor band ${floor}`,
      position: [
        placement.building.frontX,
        placement.building.baseY + floor * placement.building.floorHeight,
        placement.building.position[2],
      ],
    })
  }

  const windowGeometry = new THREE.BoxGeometry(0.09, 1.15, 1.12)
  geometries.add(windowGeometry)
  const windows = new THREE.InstancedMesh(
    windowGeometry,
    windowMaterial,
    BUILDING_WINDOW_COLUMNS * BUILDING_WINDOW_ROWS,
  )
  windows.name = 'Upper and lower classroom windows'
  const matrix = new THREE.Matrix4()
  let instance = 0
  for (let row = 0; row < BUILDING_WINDOW_ROWS; row += 1) {
    for (let column = 0; column < BUILDING_WINDOW_COLUMNS; column += 1) {
      const z = placement.building.position[2]
        - placement.building.width / 2
        + 1.25
        + column * ((placement.building.width - 2.5) / (BUILDING_WINDOW_COLUMNS - 1))
      const y = placement.building.baseY + 1.15
        + row * placement.building.floorHeight
      matrix.makeTranslation(placement.building.frontX - 0.05, y, z)
      windows.setMatrixAt(instance, matrix)
      instance += 1
    }
  }
  windows.instanceMatrix.needsUpdate = true
  group.add(windows)
}

function createSideHallway(group, placement, materials, geometries) {
  const material = (color, options = {}) => {
    const value = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.86,
      metalness: 0,
      ...options,
    })
    materials.add(value)
    return value
  }
  const floorMaterial = material(CAMPUS_ENVIRONMENT_PALETTE.hallwayFloor)
  const wallMaterial = material(CAMPUS_ENVIRONMENT_PALETTE.hallwayWall)
  const ceilingMaterial = material(CAMPUS_ENVIRONMENT_PALETTE.hallwayCeiling)
  const doorMaterial = material(CAMPUS_ENVIRONMENT_PALETTE.door)
  const lockerMaterial = material(CAMPUS_ENVIRONMENT_PALETTE.locker)
  const accentMaterial = material(CAMPUS_ENVIRONMENT_PALETTE.accent, {
    emissive: CAMPUS_ENVIRONMENT_PALETTE.accent,
    emissiveIntensity: 0.18,
  })

  const floorGeometry = new THREE.BoxGeometry(
    placement.hallway.width,
    0.12,
    placement.hallway.length,
  )
  geometries.add(floorGeometry)
  addMesh(group, floorGeometry, floorMaterial, {
    name: 'Suggested hallway floor',
    position: [
      placement.hallway.centerX,
      placement.hallway.baseY - 0.04,
      placement.hallway.centerZ,
    ],
  })

  const ceilingGeometry = new THREE.BoxGeometry(
    placement.hallway.width,
    0.14,
    placement.hallway.length,
  )
  geometries.add(ceilingGeometry)
  addMesh(group, ceilingGeometry, ceilingMaterial, {
    name: 'Suggested hallway ceiling',
    position: [
      placement.hallway.centerX,
      placement.hallway.baseY + placement.hallway.height,
      placement.hallway.centerZ,
    ],
  })

  const outerWallGeometry = new THREE.BoxGeometry(
    0.16,
    placement.hallway.height,
    placement.hallway.length,
  )
  geometries.add(outerWallGeometry)
  addMesh(group, outerWallGeometry, wallMaterial, {
    name: 'Suggested hallway outer wall',
    position: [
      placement.hallway.outerX,
      placement.hallway.baseY + placement.hallway.height / 2,
      placement.hallway.centerZ,
    ],
  })

  const doorGeometry = new THREE.BoxGeometry(0.12, 2.18, 1.2)
  geometries.add(doorGeometry)
  placement.hallway.doorZ.forEach((z, index) => {
    addMesh(group, doorGeometry, doorMaterial, {
      name: `Hallway classroom door ${index + 1}`,
      position: [
        placement.hallway.outerX + 0.1,
        placement.hallway.baseY + 1.09,
        z,
      ],
    })
  })

  const lockerGeometry = new THREE.BoxGeometry(0.18, 1.65, 0.72)
  geometries.add(lockerGeometry)
  const lockers = new THREE.InstancedMesh(
    lockerGeometry,
    lockerMaterial,
    placement.hallway.lockerZ.length,
  )
  lockers.name = 'Hallway lockers'
  const lockerMatrix = new THREE.Matrix4()
  placement.hallway.lockerZ.forEach((z, index) => {
    lockerMatrix.makeTranslation(
      placement.hallway.outerX + 0.17,
      placement.hallway.baseY + 0.825,
      z,
    )
    lockers.setMatrixAt(index, lockerMatrix)
  })
  lockers.instanceMatrix.needsUpdate = true
  group.add(lockers)

  const signGeometry = new THREE.BoxGeometry(0.08, 0.3, 0.72)
  geometries.add(signGeometry)
  placement.hallway.doorZ.forEach((z, index) => {
    addMesh(group, signGeometry, accentMaterial, {
      name: `Hallway room sign ${index + 1}`,
      position: [
        placement.hallway.outerX + 0.19,
        placement.hallway.baseY + 2.42,
        z,
      ],
    })
  })

  const endWallGeometry = new THREE.BoxGeometry(
    placement.hallway.width,
    placement.hallway.height,
    0.15,
  )
  geometries.add(endWallGeometry)
  addMesh(group, endWallGeometry, wallMaterial, {
    name: 'Hallway end wall',
    position: [
      placement.hallway.centerX,
      placement.hallway.baseY + placement.hallway.height / 2,
      placement.hallway.endZ,
    ],
  })
}

function createClassroomEnclosure(group, placement, materials, geometries) {
  const material = (color, options = {}) => {
    const value = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.88,
      metalness: 0,
      ...options,
    })
    materials.add(value)
    return value
  }
  const wallMaterial = material(CAMPUS_ENVIRONMENT_PALETTE.classroomWall)
  const ceilingMaterial = material(CAMPUS_ENVIRONMENT_PALETTE.classroomCeiling)
  const trimMaterial = material(CAMPUS_ENVIRONMENT_PALETTE.trim)
  const doorMaterial = material(CAMPUS_ENVIRONMENT_PALETTE.door)
  const glassMaterial = material(CAMPUS_ENVIRONMENT_PALETTE.window, {
    emissive: CAMPUS_ENVIRONMENT_PALETTE.windowGlow,
    emissiveIntensity: 0.12,
    opacity: 0.72,
    transparent: true,
  })
  const accentMaterial = material(CAMPUS_ENVIRONMENT_PALETTE.accent, {
    emissive: CAMPUS_ENVIRONMENT_PALETTE.accent,
    emissiveIntensity: 0.16,
  })
  const cameraBlockers = []
  const addCameraBlocker = (geometry, meshMaterial, configuration) => {
    const mesh = addMesh(group, geometry, meshMaterial, configuration)
    cameraBlockers.push(mesh)
    return mesh
  }
  const room = placement.classroom

  const rearWallGeometry = new THREE.BoxGeometry(
    room.width,
    room.height,
    room.wallThickness,
  )
  geometries.add(rearWallGeometry)
  addCameraBlocker(rearWallGeometry, wallMaterial, {
    name: 'Classroom rear wall',
    position: [room.centerX, room.floorY + room.height / 2, room.rearZ],
  })

  const ceilingGeometry = new THREE.BoxGeometry(
    room.width + room.wallThickness,
    room.ceilingThickness,
    room.length + room.wallThickness,
  )
  geometries.add(ceilingGeometry)
  addCameraBlocker(ceilingGeometry, ceilingMaterial, {
    name: 'Classroom ceiling and roof slab',
    position: [
      room.centerX,
      room.ceilingY + room.ceilingThickness / 2,
      room.centerZ,
    ],
  })

  const openingMinZ = room.door.centerZ - room.door.width / 2
  const openingMaxZ = room.door.centerZ + room.door.width / 2
  const rearSegmentLength = Math.max(openingMinZ - room.rearZ, 0)
  const frontSegmentLength = Math.max(room.frontZ - openingMaxZ, 0)
  const leftWallGeometryRear = new THREE.BoxGeometry(
    room.wallThickness,
    room.height,
    rearSegmentLength,
  )
  const leftWallGeometryFront = new THREE.BoxGeometry(
    room.wallThickness,
    room.height,
    frontSegmentLength,
  )
  const lintelGeometry = new THREE.BoxGeometry(
    room.wallThickness,
    room.height - room.door.height,
    room.door.width,
  )
  geometries.add(leftWallGeometryRear)
  geometries.add(leftWallGeometryFront)
  geometries.add(lintelGeometry)

  if (rearSegmentLength > 0) {
    addCameraBlocker(leftWallGeometryRear, wallMaterial, {
      name: 'Classroom left rear wall',
      position: [
        room.leftX,
        room.floorY + room.height / 2,
        room.rearZ + rearSegmentLength / 2,
      ],
    })
  }
  if (frontSegmentLength > 0) {
    addCameraBlocker(leftWallGeometryFront, wallMaterial, {
      name: 'Classroom left front wall',
      position: [
        room.leftX,
        room.floorY + room.height / 2,
        openingMaxZ + frontSegmentLength / 2,
      ],
    })
  }
  addCameraBlocker(lintelGeometry, wallMaterial, {
    name: 'Classroom doorway lintel',
    position: [
      room.leftX,
      room.floorY + room.door.height
        + (room.height - room.door.height) / 2,
      room.door.centerZ,
    ],
  })

  const doorGeometry = new THREE.BoxGeometry(
    room.door.thickness,
    room.door.height,
    room.door.width - 0.1,
  )
  geometries.add(doorGeometry)
  addCameraBlocker(doorGeometry, doorMaterial, {
    name: 'Closed hallway door',
    position: [
      room.leftX + room.wallThickness / 2 + 0.015,
      room.floorY + room.door.height / 2,
      room.door.centerZ,
    ],
  })

  const verticalFrameGeometry = new THREE.BoxGeometry(
    room.wallThickness + 0.08,
    room.door.height + 0.12,
    0.1,
  )
  const topFrameGeometry = new THREE.BoxGeometry(
    room.wallThickness + 0.08,
    0.1,
    room.door.width + 0.1,
  )
  geometries.add(verticalFrameGeometry)
  geometries.add(topFrameGeometry)
  const frameDirections = [-1, 1]
  frameDirections.forEach((direction, index) => {
    addMesh(group, verticalFrameGeometry, trimMaterial, {
      name: `Hallway door frame side ${index + 1}`,
      position: [
        room.leftX + 0.015,
        room.floorY + (room.door.height + 0.12) / 2,
        room.door.centerZ + direction * (room.door.width / 2 + 0.05),
      ],
    })
  })
  addMesh(group, topFrameGeometry, trimMaterial, {
    name: 'Hallway door frame top',
    position: [
      room.leftX + 0.015,
      room.floorY + room.door.height + 0.06,
      room.door.centerZ,
    ],
  })

  const doorWindowGeometry = new THREE.BoxGeometry(0.035, 0.72, 0.3)
  geometries.add(doorWindowGeometry)
  addMesh(group, doorWindowGeometry, glassMaterial, {
    name: 'Hallway door window',
    position: [
      room.leftX + room.wallThickness / 2 + room.door.thickness / 2 + 0.035,
      room.floorY + 1.56,
      room.door.centerZ,
    ],
  })

  const handleGeometry = new THREE.CylinderGeometry(0.035, 0.035, 0.13, 12)
  geometries.add(handleGeometry)
  addMesh(group, handleGeometry, trimMaterial, {
    name: 'Hallway door handle',
    position: [
      room.leftX + room.wallThickness / 2 + room.door.thickness / 2 + 0.055,
      room.floorY + 1.02,
      room.door.centerZ + room.door.width * 0.31,
    ],
    rotation: [0, 0, Math.PI / 2],
  })

  const signGeometry = new THREE.BoxGeometry(
    room.wallThickness + 0.06,
    0.24,
    0.72,
  )
  geometries.add(signGeometry)
  addMesh(group, signGeometry, accentMaterial, {
    name: 'Hallway door sign',
    position: [
      room.leftX + 0.02,
      room.floorY + room.door.height + 0.34,
      room.door.centerZ,
    ],
  })

  const rearBaseboardGeometry = new THREE.BoxGeometry(
    room.width,
    0.16,
    0.08,
  )
  geometries.add(rearBaseboardGeometry)
  addMesh(group, rearBaseboardGeometry, trimMaterial, {
    name: 'Classroom rear baseboard',
    position: [room.centerX, room.floorY + 0.08, room.rearZ + 0.12],
  })

  const thresholdGeometry = new THREE.BoxGeometry(
    room.door.thresholdWidth,
    0.045,
    room.door.width + 0.06,
  )
  geometries.add(thresholdGeometry)
  addMesh(group, thresholdGeometry, trimMaterial, {
    name: 'Hallway doorway threshold',
    position: [room.leftX, room.floorY + 0.0225, room.door.centerZ],
  })

  return cameraBlockers
}

export function createCampusPlacement(roomBounds, { floorY = 0 } = {}) {
  const center = roomBounds.getCenter(new THREE.Vector3())
  const size = roomBounds.getSize(new THREE.Vector3())
  const facadeWidth = Math.max(size.x + 12, 20)
  const floorHeight = 2.45
  const buildingHeight = floorHeight * BUILDING_WINDOW_ROWS + 0.65
  const buildingX = roomBounds.max.x + Math.max(size.x * 0.95, 9)
  const hallwayWidth = Math.max(size.x * 0.42, 4.2)
  const hallwayLength = size.z + 3.5
  const hallwayOverlap = 0.18
  const hallwayCenterX = roomBounds.min.x - hallwayWidth / 2 + hallwayOverlap
  const roomHeight = Math.max(roomBounds.max.y - floorY, 3.15)
  const doorWidth = 1.16
  const doorCenterZ = Math.min(
    roomBounds.min.z + 1.45,
    roomBounds.max.z - doorWidth / 2 - 0.35,
  )

  return {
    center: [center.x, center.y, center.z],
    sky: {
      radius: Math.max(size.x, size.z, 10) * 4,
      position: [center.x, floorY + 3.8, center.z],
    },
    sun: [
      buildingX + 2.2,
      floorY + 9.5,
      center.z - Math.max(size.z * 0.7, 6),
    ],
    ground: {
      size: Math.max(size.x, size.z, 10) * 3.2,
      y: floorY - 0.08,
      centerX: center.x + size.x * 0.55,
      centerZ: center.z,
    },
    building: {
      width: facadeWidth,
      height: buildingHeight,
      baseY: floorY,
      floorHeight,
      frontX: buildingX - 0.32,
      position: [buildingX, floorY + buildingHeight / 2, center.z],
    },
    classroom: {
      centerX: center.x,
      centerZ: center.z,
      floorY,
      ceilingY: floorY + roomHeight,
      height: roomHeight,
      width: size.x,
      length: size.z,
      leftX: roomBounds.min.x,
      rearZ: roomBounds.min.z,
      frontZ: roomBounds.max.z,
      wallThickness: 0.18,
      ceilingThickness: 0.18,
      door: {
        centerZ: doorCenterZ,
        width: doorWidth,
        height: 2.24,
        thickness: 0.11,
        thresholdWidth: 0.56,
      },
    },
    hallway: {
      baseY: floorY,
      centerX: hallwayCenterX,
      centerZ: center.z,
      width: hallwayWidth,
      height: 3.15,
      length: hallwayLength,
      outerX: roomBounds.min.x - hallwayWidth + hallwayOverlap,
      endZ: center.z + hallwayLength / 2,
      doorZ: [center.z - size.z * 0.24, center.z + size.z * 0.24],
      lockerZ: [center.z - 0.78, center.z, center.z + 0.78],
    },
  }
}

export function createClassroomCampusEnvironment({ roomBounds }) {
  const placement = createCampusPlacement(roomBounds)
  const group = new THREE.Group()
  const materials = new Set()
  const geometries = new Set()
  group.name = 'Sunlit music-school scenery'
  group.userData.playable = false

  const skyGeometry = new THREE.SphereGeometry(placement.sky.radius, 32, 18)
  const skyMaterial = createSkyMaterial()
  geometries.add(skyGeometry)
  materials.add(skyMaterial)
  const sky = addMesh(group, skyGeometry, skyMaterial, {
    name: 'Blush sunrise sky',
    position: placement.sky.position,
  })
  sky.renderOrder = -10

  const groundGeometry = new THREE.PlaneGeometry(
    placement.ground.size,
    placement.ground.size,
  )
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: CAMPUS_ENVIRONMENT_PALETTE.grass,
    roughness: 1,
    metalness: 0,
  })
  geometries.add(groundGeometry)
  materials.add(groundMaterial)
  addMesh(group, groundGeometry, groundMaterial, {
    name: 'School courtyard ground',
    position: [placement.ground.centerX, placement.ground.y, placement.ground.centerZ],
    rotation: [-Math.PI / 2, 0, 0],
  })

  createSun(group, placement, materials, geometries)
  createCourtyardSchool(group, placement, materials, geometries)
  createSideHallway(group, placement, materials, geometries)
  const cameraBlockers = createClassroomEnclosure(
    group,
    placement,
    materials,
    geometries,
  )
  group.updateMatrixWorld(true)

  const sunlight = new THREE.DirectionalLight(0xffc59d, 0.42)
  sunlight.name = 'Warm campus sunlight'
  sunlight.position.set(
    placement.sun[0],
    placement.sun[1],
    placement.sun[2],
  )
  group.add(sunlight)

  return {
    object3d: group,
    placement,
    cameraBlockers,
    occlusionMeshes: cameraBlockers,
    dispose() {
      group.removeFromParent()
      geometries.forEach(geometry => geometry.dispose())
      materials.forEach(material => material.dispose())
    },
  }
}
