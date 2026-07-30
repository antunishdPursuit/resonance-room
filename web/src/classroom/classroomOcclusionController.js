import * as THREE from 'three'

const AVATAR_TARGET_HEIGHT = 1.25
const OCCLUDED_OPACITY = 0.2
const FADE_SPEED = 12
const RESTORE_SPEED = 8
const RELEASE_DELAY_SECONDS = 0.08
const TARGET_CLEARANCE = 0.05
const OPACITY_EPSILON = 0.005

function asMaterialArray(material) {
  return Array.isArray(material) ? material : [material]
}

function copyMaterialShape(source, materials) {
  return Array.isArray(source) ? materials : materials[0]
}

function transitionAmount(speed, delta) {
  return 1 - Math.exp(-speed * Math.max(delta, 0))
}

export function createClassroomOcclusionController({
  camera,
  avatarRoot,
  classroomMeshes,
  reducedMotion = false,
}) {
  const raycaster = new THREE.Raycaster()
  const cameraPosition = new THREE.Vector3()
  const avatarTarget = new THREE.Vector3()
  const rayDirection = new THREE.Vector3()
  const materialStates = new Map()

  function getMaterialState(mesh) {
    const existingState = materialStates.get(mesh)
    if (existingState) return existingState

    const originalMaterial = mesh.material
    const clonedMaterials = asMaterialArray(originalMaterial).map(
      material => material.clone(),
    )
    const state = {
      originalMaterial,
      clonedMaterials,
      properties: clonedMaterials.map(material => ({
        opacity: material.opacity,
        transparent: material.transparent,
        depthWrite: material.depthWrite,
      })),
      secondsSinceOccluded: 0,
    }

    mesh.material = copyMaterialShape(originalMaterial, clonedMaterials)
    materialStates.set(mesh, state)
    return state
  }

  function findOccludingMeshes() {
    camera.getWorldPosition(cameraPosition)
    avatarRoot.getWorldPosition(avatarTarget)
    avatarTarget.y += AVATAR_TARGET_HEIGHT
    rayDirection.subVectors(avatarTarget, cameraPosition)

    const targetDistance = rayDirection.length()
    if (targetDistance <= TARGET_CLEARANCE) return new Set()

    raycaster.set(cameraPosition, rayDirection.normalize())
    raycaster.near = 0
    raycaster.far = targetDistance - TARGET_CLEARANCE

    return new Set(
      raycaster
        .intersectObjects(classroomMeshes, false)
        .map(intersection => intersection.object),
    )
  }

  function updateMaterial(state, shouldFade, delta) {
    const amount = reducedMotion
      ? 1
      : transitionAmount(shouldFade ? FADE_SPEED : RESTORE_SPEED, delta)

    state.clonedMaterials.forEach((material, index) => {
      const original = state.properties[index]
      const targetOpacity = shouldFade
        ? Math.min(original.opacity, OCCLUDED_OPACITY)
        : original.opacity

      if (shouldFade) {
        if (!material.transparent || material.depthWrite) {
          material.transparent = true
          material.depthWrite = false
          material.needsUpdate = true
        }
      }

      material.opacity = THREE.MathUtils.lerp(
        material.opacity,
        targetOpacity,
        amount,
      )

      if (
        !shouldFade
        && Math.abs(material.opacity - original.opacity) <= OPACITY_EPSILON
      ) {
        material.opacity = original.opacity
        if (
          material.transparent !== original.transparent
          || material.depthWrite !== original.depthWrite
        ) {
          material.transparent = original.transparent
          material.depthWrite = original.depthWrite
          material.needsUpdate = true
        }
      }
    })
  }

  return {
    update(delta) {
      const occludingMeshes = findOccludingMeshes()

      occludingMeshes.forEach((mesh) => {
        getMaterialState(mesh).secondsSinceOccluded = 0
      })

      materialStates.forEach((state, mesh) => {
        if (!occludingMeshes.has(mesh)) {
          state.secondsSinceOccluded += Math.max(delta, 0)
        }

        updateMaterial(
          state,
          occludingMeshes.has(mesh)
            || state.secondsSinceOccluded < RELEASE_DELAY_SECONDS,
          delta,
        )
      })

      return occludingMeshes.size
    },

    dispose() {
      materialStates.forEach((state, mesh) => {
        mesh.material = state.originalMaterial
        state.clonedMaterials.forEach(material => material.dispose())
      })
      materialStates.clear()
    },
  }
}
