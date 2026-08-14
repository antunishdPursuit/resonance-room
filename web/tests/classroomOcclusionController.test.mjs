import assert from 'node:assert/strict'
import test from 'node:test'
import * as THREE from 'three'

import {
  createClassroomOcclusionController,
} from '../src/classroom/classroomOcclusionController.js'

function createSceneTest({
  reducedMotion = false,
} = {}) {
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20)
  camera.position.set(0, 1.25, 5)
  camera.lookAt(0, 1.25, 0)
  camera.updateMatrixWorld(true)

  const avatarRoot = new THREE.Group()
  avatarRoot.updateMatrixWorld(true)

  const sharedMaterial = new THREE.MeshBasicMaterial()
  const blocker = new THREE.Mesh(
    new THREE.BoxGeometry(2, 2.5, 0.2),
    sharedMaterial,
  )
  blocker.position.set(0, 1.25, 2)

  const clearMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    sharedMaterial,
  )
  clearMesh.position.set(4, 1, 2)

  const behindAvatar = new THREE.Mesh(
    new THREE.BoxGeometry(2, 2.5, 0.2),
    sharedMaterial,
  )
  behindAvatar.position.set(0, 1.25, -2)

  const classroomMeshes = [blocker, clearMesh, behindAvatar]
  classroomMeshes.forEach(mesh => mesh.updateMatrixWorld(true))

  const controller = createClassroomOcclusionController({
    camera,
    avatarRoot,
    classroomMeshes,
    reducedMotion,
  })

  return {
    behindAvatar,
    blocker,
    clearMesh,
    controller,
    sharedMaterial,
  }
}

test('fades only classroom geometry between the camera and Riri', () => {
  const {
    behindAvatar,
    blocker,
    clearMesh,
    controller,
    sharedMaterial,
  } = createSceneTest()

  assert.equal(controller.update(1 / 60), 1)
  assert.notEqual(blocker.material, sharedMaterial)
  assert.ok(blocker.material.opacity < 1)
  assert.equal(blocker.material.transparent, true)
  assert.equal(blocker.material.depthWrite, false)
  assert.equal(clearMesh.material, sharedMaterial)
  assert.equal(behindAvatar.material, sharedMaterial)
  assert.equal(sharedMaterial.opacity, 1)

  controller.dispose()
})

test('restores the original appearance after the view clears', () => {
  const {
    blocker,
    controller,
    sharedMaterial,
  } = createSceneTest()

  for (let index = 0; index < 30; index += 1) {
    controller.update(1 / 60)
  }
  assert.ok(blocker.material.opacity < 0.3)

  blocker.position.x = 4
  blocker.updateMatrixWorld(true)
  for (let index = 0; index < 90; index += 1) {
    controller.update(1 / 60)
  }

  assert.equal(blocker.material.opacity, 1)
  assert.equal(blocker.material.transparent, false)
  assert.equal(blocker.material.depthWrite, true)

  controller.dispose()
  assert.equal(blocker.material, sharedMaterial)
})

test('shortens the fade for reduced-motion visitors', () => {
  const {
    blocker,
    controller,
  } = createSceneTest({ reducedMotion: true })

  controller.update(1 / 60)

  assert.equal(blocker.material.opacity, 0.2)
  controller.dispose()
})
