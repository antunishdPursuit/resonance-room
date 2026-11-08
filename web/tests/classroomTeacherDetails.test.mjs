import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import * as THREE from 'three'
import { createTeacherDetails } from '../src/classroom/classroomTeacherDetails.js'

function lectern() {
  const source = JSON.parse(
    readFileSync(new URL('../public/Classroom/scene.gltf', import.meta.url)),
  )
  const primitive = source.meshes[source.nodes[31].mesh].primitives[0]
  const accessor = source.accessors[primitive.attributes.POSITION]
  const view = source.bufferViews[accessor.bufferView]
  const buffer = readFileSync(
    new URL(`../public/Classroom/${source.buffers[view.buffer].uri}`, import.meta.url),
  )
  const positions = []
  for (let i = 0; i < accessor.count; i++) {
    for (let axis = 0; axis < 3; axis++) {
      positions.push(
        buffer.readFloatLE(
          (view.byteOffset ?? 0) +
            (accessor.byteOffset ?? 0) +
            i * (view.byteStride ?? 12) +
            axis * 4,
        ),
      )
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  const indices = source.accessors[primitive.indices]
  const indexView = source.bufferViews[indices.bufferView]
  const indexBuffer = readFileSync(
    new URL(`../public/Classroom/${source.buffers[indexView.buffer].uri}`, import.meta.url),
  )
  const size = indices.componentType === 5125 ? 4 : 2
  geometry.setIndex(
    Array.from({ length: indices.count }, (_, i) => {
      const offset = (indexView.byteOffset ?? 0) + (indices.byteOffset ?? 0) + i * size
      return size === 4 ? indexBuffer.readUInt32LE(offset) : indexBuffer.readUInt16LE(offset)
    }),
  )
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }))
  mesh.userData.classroomSource = { nodeIndex: 31 }
  mesh.updateMatrixWorld(true)
  return mesh
}

test('notebook rests on the actual lectern slope and accessories preserve its collision footprint', () => {
  const source = lectern()
  const details = createTeacherDetails([source])
  const notebook = details.object3d.getObjectByName('Lectern notebook')
  for (const x of [-0.13, 0.13]) {
    for (const z of [-0.12, 0.12]) {
      const point = notebook.localToWorld(new THREE.Vector3(x, 0, z))
      const ray = new THREE.Raycaster(
        new THREE.Vector3(point.x, 2, point.z),
        new THREE.Vector3(0, -1, 0),
      )
      const contact = ray.intersectObject(source)[0]
      assert.ok(contact)
      assert.ok(
        Math.abs(point.y - contact.point.y) < 0.003,
        'Notebook floats or clips into the lectern',
      )
    }
  }
  const bounds = new THREE.Box3().setFromObject(source)
  const props = new THREE.Box3().setFromObject(details.object3d)
  assert.ok(props.min.x >= bounds.min.x && props.max.x <= bounds.max.x)
  assert.ok(props.min.z >= bounds.min.z && props.max.z <= bounds.max.z)
  const cup = new THREE.Box3().setFromObject(details.object3d.getObjectByName('Pencil cup wall'))
  const ledge = new THREE.Box3().setFromObject(
    details.object3d.getObjectByName('Level pencil ledge'),
  )
  assert.ok(Math.abs(cup.min.y - ledge.max.y) < 0.00001)
  const bracket = new THREE.Box3().setFromObject(
    details.object3d.getObjectByName('Pencil ledge bracket'),
  )
  const attachment = new THREE.Raycaster(
    new THREE.Vector3(0.3, 1.09, bracket.max.z),
    new THREE.Vector3(0, 0, -1),
    0,
    bracket.max.z - bracket.min.z,
  )
  assert.ok(
    attachment.intersectObject(source).length > 0,
    'Ledge bracket must reach the solid lectern body',
  )
  assert.equal(
    details.object3d.children.filter((mesh) => /Pencil \d shaft/.test(mesh.name)).length,
    3,
  )
  details.dispose()
  source.geometry.dispose()
  source.material.dispose()
})

test('teacher accessories release their own resources without owning source geometry', () => {
  const source = lectern()
  let sourceDisposed = false
  source.geometry.addEventListener('dispose', () => (sourceDisposed = true))
  const details = createTeacherDetails([source])
  const resources = new Set()
  details.object3d.traverse((mesh) => {
    if (mesh.geometry) resources.add(mesh.geometry)
    if (mesh.material) resources.add(mesh.material)
  })
  let disposed = 0
  resources.forEach((resource) => resource.addEventListener('dispose', () => disposed++))
  details.dispose()
  assert.equal(disposed, resources.size)
  assert.equal(sourceDisposed, false)
  source.geometry.dispose()
  source.material.dispose()
})
