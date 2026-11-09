import * as THREE from 'three'
import { createTeacherDetails } from './classroomTeacherDetails.js'
import { createWallDetails } from './classroomWallDetails.js'

export function createClassroomDetails(classroomMeshes, layout = {}) {
  const object3d = new THREE.Group()
  object3d.name = 'Classroom shelf and window details'
  const teacherDetails = createTeacherDetails(classroomMeshes)
  teacherDetails.object3d.position.z += layout.front ?? 0
  object3d.add(teacherDetails.object3d)
  const wallDetails = createWallDetails(classroomMeshes, { layout })
  object3d.add(wallDetails.object3d)
  const geometries = new Set()
  const materials = new Set()
  const geometry = (value) => {
    geometries.add(value)
    return value
  }
  const material = (color) => {
    const value = new THREE.MeshStandardMaterial({ color, roughness: 0.8 })
    materials.add(value)
    return value
  }
  const cube = geometry(new THREE.BoxGeometry(1, 1, 1))
  const cream = material(0xd4c5ab)
  const plum = material(0x765970)
  const handle = material(0x443540)
  const find = (node) =>
    classroomMeshes.find((mesh) => mesh.userData.classroomSource?.nodeIndex === node)
  function box(name, size, position, surface) {
    const mesh = new THREE.Mesh(cube, surface)
    mesh.name = name
    mesh.scale.set(...size)
    mesh.position.set(...position)
    mesh.castShadow = true
    mesh.receiveShadow = true
    object3d.add(mesh)
    return mesh
  }

  if (find(23)) {
    // Shelf levels and bay interiors are measured from the retained classroom asset.
    const shelves = [0.107, 0.659, 1.212]
    const books = [
      ...Array.from({ length: 5 }, (_, i) => [
        -0.46 + i * 0.055,
        shelves[2],
        0.25 + (i % 3) * 0.02,
      ]),
      ...Array.from({ length: 4 }, (_, i) => [2.98 + i * 0.065, shelves[1], 0.28 - (i % 2) * 0.04]),
    ]
    const covers = new THREE.InstancedMesh(cube, material(0xffffff), books.length)
    covers.name = 'Shelf books'
    const bands = new THREE.InstancedMesh(cube, cream, books.length * 2)
    bands.name = 'Book spine bands'
    const transform = new THREE.Object3D()
    const colors = [0x74586c, 0xaa7c7d, 0xb6a582, 0x655d78]
    books.forEach(([x, bottom, height], i) => {
      transform.position.set(x, bottom + height / 2, -4.66)
      transform.scale.set(0.045, height, 0.18)
      transform.updateMatrix()
      covers.setMatrixAt(i, transform.matrix)
      covers.setColorAt(i, new THREE.Color(colors[i % colors.length]))
      for (let band = 0; band < 2; band++) {
        transform.position.set(x, bottom + height * (band ? 0.82 : 0.18), -4.568)
        transform.scale.set(0.03, 0.006, 0.004)
        transform.updateMatrix()
        bands.setMatrixAt(i * 2 + band, transform.matrix)
      }
    })
    covers.castShadow = true
    covers.receiveShadow = true
    object3d.add(covers, bands)
    for (const [index, x, bottom, surface] of [
      [0, 2.56, shelves[1], plum],
      [1, 3.72, shelves[0], cream],
    ]) {
      box(`Storage box ${index + 1}`, [0.32, 0.25, 0.22], [x, bottom + 0.125, -4.66], surface)
      box(`Storage lid ${index + 1}`, [0.34, 0.022, 0.24], [x, bottom + 0.261, -4.66], surface)
      box(`Storage handle ${index + 1}`, [0.09, 0.025, 0.006], [x, bottom + 0.15, -4.546], handle)
    }
  }

  const windowMeshes = classroomMeshes.filter((mesh) =>
    [45, 47].includes(mesh.userData.classroomSource?.nodeIndex),
  )
  if (windowMeshes.length) {
    const pot = geometry(new THREE.CylinderGeometry(0.1, 0.075, 0.18, 12))
    const soil = geometry(new THREE.CylinderGeometry(0.086, 0.086, 0.012, 12))
    const leaf = geometry(new THREE.SphereGeometry(1, 8, 6))
    const stem = geometry(new THREE.CylinderGeometry(0.009, 0.012, 0.22, 6))
    const terracotta = material(0xb88780)
    const earth = material(0x45392f)
    const green = material(0x718752)
    const leaves = new THREE.InstancedMesh(leaf, green, 12)
    leaves.name = 'Window plant leaves'
    const transform = new THREE.Object3D()
    for (let plant = 0; plant < 2; plant++) {
      const z = -2.9 + plant * 0.8
      const base = 1.133
      for (const [name, shape, surface, y] of [
        ['pot', pot, plant ? terracotta : cream, base + 0.09],
        ['soil', soil, earth, base + 0.177],
        ['stem', stem, green, base + 0.28],
      ]) {
        const mesh = new THREE.Mesh(shape, surface)
        mesh.name = `Window plant ${plant + 1} ${name}`
        mesh.position.set(4.35, y, z)
        mesh.castShadow = true
        mesh.receiveShadow = true
        object3d.add(mesh)
      }
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI * 2) / 6
        transform.position.set(
          4.35 + Math.cos(angle) * 0.07,
          base + 0.32 + (i % 2) * 0.09,
          z + Math.sin(angle) * 0.07,
        )
        transform.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          new THREE.Vector3(Math.cos(angle) * 0.75, 0.65, Math.sin(angle) * 0.75).normalize(),
        )
        transform.scale.set(0.075, 0.12, 0.025)
        transform.updateMatrix()
        leaves.setMatrixAt(plant * 6 + i, transform.matrix)
      }
    }
    leaves.castShadow = true
    leaves.receiveShadow = true
    object3d.add(leaves)
  }

  // Reuse the existing clock's atlas and geometry, facing inward above the rear shelves.
  const clock = find(8)
  const clockState = clock
    ? {
        geometry: clock.geometry,
        position: clock.position.clone(),
        quaternion: clock.quaternion.clone(),
      }
    : null
  if (clock) {
    clock.geometry.computeBoundingBox()
    const center = clock.geometry.boundingBox.getCenter(new THREE.Vector3())
    clock.geometry = geometry(clock.geometry.clone())
    clock.geometry.translate(-center.x, -center.y, -center.z)
    clock.position.set(2.7, 2.55, -4.72 - (layout.rear ?? 0))
    clock.rotation.y = Math.PI
  }
  for (const child of object3d.children) {
    if (/Shelf books|Book spine|Storage/.test(child.name)) child.position.z -= layout.rear ?? 0
    if (child.name.startsWith('Window plant')) child.position.x += layout.side ?? 0
  }
  object3d.updateMatrixWorld(true)
  return {
    object3d,
    dispose() {
      teacherDetails.dispose()
      wallDetails.dispose()
      object3d.removeFromParent()
      object3d.traverse((object) => {
        if (object.isInstancedMesh) object.dispose()
      })
      if (clock) {
        clock.geometry = clockState.geometry
        clock.position.copy(clockState.position)
        clock.quaternion.copy(clockState.quaternion)
      }
      geometries.forEach((value) => value.dispose())
      materials.forEach((value) => value.dispose())
    },
  }
}
