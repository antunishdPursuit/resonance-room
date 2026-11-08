import assert from 'node:assert/strict'
import test from 'node:test'
import * as THREE from 'three'
import { createWallDetails } from '../src/classroom/classroomWallDetails.js'
import { RECOMMENDATION_BOARD_PLACEMENT as board } from '../src/classroom/classroomRecommendationBoard.js'

test('wall art stays above lowered corridor windows, clear of the door and song results', () => {
  const source = [6, 52].map((nodeIndex) => ({ userData: { classroomSource: { nodeIndex } } }))
  const texture = new THREE.Texture()
  const details = createWallDetails(source, { createTexture: () => texture })
  const chalk = details.object3d.getObjectByName('Auxiliary chalk music')
  const bounds = new THREE.Box3().setFromObject(chalk)
  assert.ok(bounds.max.x < board.position[0] - board.width / 2)
  assert.ok(bounds.min.x > -3.84 && bounds.max.x < -2.35)
  assert.ok(bounds.min.y > 0.984 && bounds.max.y < 2.312)
  assert.ok(bounds.max.z < 4.754665, 'Chalk must be in front of the imported board')
  const panels = details.object3d.children.filter(
    (mesh) => mesh.isMesh && !mesh.isInstancedMesh && mesh !== chalk,
  )
  assert.equal(panels.length, 3)
  const sorted = panels
    .map((mesh) => new THREE.Box3().setFromObject(mesh))
    .sort((a, b) => a.min.z - b.min.z)
  for (const bounds of sorted) {
    assert.ok(bounds.min.y - 0.03 > 2.435, 'Artwork frame covers the lowered window frame')
    assert.ok(bounds.max.y + 0.03 < 3.07, 'Artwork frame reaches the ceiling trim')
    assert.ok(bounds.min.z > 1, 'Artwork reaches the rear doorway')
    assert.ok(bounds.min.x > -4.02 && bounds.max.x < -3.8, 'Artwork protrudes into the aisle')
  }
  for (let i = 1; i < sorted.length; i++) assert.ok(sorted[i - 1].max.z < sorted[i].min.z)
  assert.equal(new Set([chalk, ...panels].map((mesh) => mesh.material)).size, 1)
  const resources = new Set([texture])
  details.object3d.traverse((mesh) => {
    if (mesh.geometry) resources.add(mesh.geometry)
    if (mesh.material) resources.add(mesh.material)
    if (mesh.isInstancedMesh) resources.add(mesh)
  })
  let disposed = 0
  resources.forEach((resource) => resource.addEventListener('dispose', () => disposed++))
  details.dispose()
  assert.equal(disposed, resources.size)
})

test('missing classroom surfaces do not allocate a canvas or texture', () => {
  const details = createWallDetails([], { createTexture: () => assert.fail('Unexpected texture') })
  assert.equal(details.object3d.children.length, 0)
  details.dispose()
})
