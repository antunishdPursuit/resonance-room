import assert from 'node:assert/strict'
import test from 'node:test'
import * as THREE from 'three'
import { createClassroomOcclusionController } from '../src/classroom/classroomOcclusionController.js'
import {
  applyClassroomAppearance,
  createClassroomLighting,
} from '../src/classroom/classroomAppearance.js'

test('surface treatment preserves atlas ownership, shared materials and restores source objects', () => {
  const atlas = new THREE.Texture()
  const original = new THREE.MeshStandardMaterial({ map: atlas })
  const mesh = (node) => {
    const value = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), original)
    value.userData.classroomSource = { nodeIndex: node }
    return value
  }
  const wood = mesh(18)
  const podium = mesh(31)
  const wall = mesh(52)
  const curtain = mesh(45)
  const avatarLikeMesh = new THREE.Mesh(new THREE.BoxGeometry(), original)
  const position = curtain.position.clone()
  const appearance = applyClassroomAppearance([wood, podium, wall, curtain])
  assert.equal(wood.material, podium.material)
  assert.notEqual(wood.material, wall.material)
  assert.equal(wood.material.map, atlas)
  assert.equal(avatarLikeMesh.material, original)
  assert.equal(curtain.material, original)
  assert.equal(original.roughness, 1)
  assert.equal(wall.castShadow, false)
  assert.equal(wood.castShadow, true)
  let disposed = 0
  let atlasDisposed = 0
  wood.material.addEventListener('dispose', () => disposed++)
  atlas.addEventListener('dispose', () => atlasDisposed++)
  const bounds = new THREE.Box3().setFromObject(curtain)
  assert.equal(bounds.min.z, -0.5)
  assert.equal(bounds.max.z, -0.25)
  appearance.dispose()
  assert.equal(disposed, 1)
  assert.equal(atlasDisposed, 0)
  for (const value of [wood, podium, wall, curtain]) assert.equal(value.material, original)
  assert.deepEqual(curtain.position, position)
  assert.equal(curtain.scale.z, 1)
  assert.equal(wood.castShadow, false)
})

test('lighting has one bounded shadow source and releases its scene and renderer state', () => {
  const scene = new THREE.Scene()
  const renderer = { shadowMap: { enabled: false, type: THREE.BasicShadowMap } }
  const lighting = createClassroomLighting({ scene, renderer })
  const group = scene.children[0]
  const sun = group.children.find((object) => object.isDirectionalLight)
  assert.equal(group.children.filter((object) => object.castShadow).length, 1)
  assert.equal(sun.shadow.mapSize.x, 1024)
  assert.ok(sun.position.x > sun.target.position.x)
  assert.equal(renderer.shadowMap.enabled, true)
  lighting.dispose()
  assert.equal(scene.children.length, 0)
  assert.equal(renderer.shadowMap.enabled, false)
  assert.equal(renderer.shadowMap.type, THREE.BasicShadowMap)
})

test('surface treatment survives camera occlusion fade, restore and cleanup', () => {
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20)
  camera.position.set(0, 1.25, 5)
  camera.lookAt(0, 1.25, 0)
  camera.updateMatrixWorld(true)
  const avatarRoot = new THREE.Group()
  avatarRoot.updateMatrixWorld(true)
  const original = new THREE.MeshStandardMaterial()
  const blocker = new THREE.Mesh(new THREE.BoxGeometry(2, 2.5, 0.2), original)
  blocker.position.set(0, 1.25, 2)
  blocker.userData.classroomSource = { nodeIndex: 18 }
  blocker.updateMatrixWorld(true)
  const appearance = applyClassroomAppearance([blocker])
  const treated = blocker.material
  const controller = createClassroomOcclusionController({
    camera,
    avatarRoot,
    classroomMeshes: [blocker],
    reducedMotion: true,
  })
  assert.equal(controller.update(1), 1)
  assert.equal(blocker.material.opacity, 0.2)
  assert.equal(blocker.material.onBeforeCompile, treated.onBeforeCompile)
  assert.equal(blocker.material.customProgramCacheKey(), treated.customProgramCacheKey())
  blocker.position.x = 4
  blocker.updateMatrixWorld(true)
  controller.update(1)
  assert.equal(blocker.material.opacity, 1)
  assert.equal(blocker.material.onBeforeCompile, treated.onBeforeCompile)
  controller.dispose()
  assert.equal(blocker.material, treated)
  appearance.dispose()
  assert.equal(blocker.material, original)
})
