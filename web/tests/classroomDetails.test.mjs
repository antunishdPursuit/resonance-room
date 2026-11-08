import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import * as THREE from 'three'
import { createClassroomDetails } from '../src/classroom/classroomDetails.js'

const source = JSON.parse(readFileSync(new URL('../public/Classroom/scene.gltf', import.meta.url)))
function sourceBoundsMesh(node) {
  const accessor =
    source.accessors[source.meshes[source.nodes[node].mesh].primitives[0].attributes.POSITION]
  const bounds = new THREE.Box3(
    new THREE.Vector3(...accessor.min),
    new THREE.Vector3(...accessor.max),
  )
  const geometry = new THREE.BoxGeometry(...bounds.getSize(new THREE.Vector3()).toArray())
  geometry.translate(...bounds.getCenter(new THREE.Vector3()).toArray())
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial())
  mesh.userData.classroomSource = { nodeIndex: node }
  return mesh
}

test('shelf details fit the retained storage volume and window plants stay outside the aisle', () => {
  const meshes = [8, 23, 45, 47].map(sourceBoundsMesh)
  const shelf = new THREE.Box3().setFromObject(meshes[1])
  const details = createClassroomDetails(meshes)
  const objects = details.object3d.children
  for (const object of objects.filter((value) =>
    /Shelf books|Book spine|Storage/.test(value.name),
  )) {
    const bounds = new THREE.Box3().setFromObject(object)
    assert.ok(shelf.containsBox(bounds), `${object.name} must remain within storage`)
  }
  const pots = objects.filter((value) => /Window plant.*pot/.test(value.name))
  assert.equal(pots.length, 2)
  for (const pot of pots) {
    const bounds = new THREE.Box3().setFromObject(pot)
    assert.ok(bounds.min.x > 4.17)
    assert.ok(Math.abs(bounds.min.y - 1.133) < 0.00001)
  }
  assert.equal(objects.find((value) => value.name === 'Shelf books').count, 9)
  details.dispose()
})

test('reused clock and shared resources restore and release without disposing source assets', () => {
  const meshes = [8, 23, 45, 47].map(sourceBoundsMesh)
  const clock = meshes[0]
  const originalGeometry = clock.geometry
  const originalPosition = clock.position.clone()
  const originalQuaternion = clock.quaternion.clone()
  let sourceDisposed = 0
  originalGeometry.addEventListener('dispose', () => sourceDisposed++)
  const details = createClassroomDetails(meshes)
  assert.notEqual(clock.geometry, originalGeometry)
  assert.ok(new THREE.Box3().setFromObject(clock).max.z < -4.6)
  const resources = new Set()
  details.object3d.traverse((object) => {
    if (object.geometry) resources.add(object.geometry)
    if (object.material) resources.add(object.material)
    if (object.isInstancedMesh) resources.add(object)
  })
  let disposed = 0
  resources.forEach((resource) => resource.addEventListener('dispose', () => disposed++))
  const scene = new THREE.Scene()
  scene.add(details.object3d)
  details.dispose()
  assert.equal(disposed, resources.size)
  assert.equal(sourceDisposed, 0)
  assert.equal(clock.geometry, originalGeometry)
  assert.deepEqual(clock.position, originalPosition)
  assert.deepEqual(clock.quaternion.toArray(), originalQuaternion.toArray())
  assert.equal(scene.children.length, 0)
})
