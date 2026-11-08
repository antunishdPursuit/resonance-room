import * as THREE from 'three'

export function createTeacherDetails(classroomMeshes) {
  const object3d = new THREE.Group()
  object3d.name = 'Teacher lectern accessories'
  const resources = new Set()
  const own = (resource) => (resources.add(resource), resource)
  const cube = own(new THREE.BoxGeometry(1, 1, 1))
  const material = (color) => own(new THREE.MeshStandardMaterial({ color, roughness: 0.8 }))
  const wood = material(0x76513f)
  const cream = material(0xd4c5ab)
  const plum = material(0x765970)
  const graphite = material(0x443540)
  const add = (name, geometry, surface, position, scale) => {
    const mesh = new THREE.Mesh(geometry, surface)
    mesh.name = name
    mesh.position.set(...position)
    mesh.scale.set(...scale)
    mesh.castShadow = true
    mesh.receiveShadow = true
    object3d.add(mesh)
    return mesh
  }
  if (classroomMeshes.some((mesh) => mesh.userData.classroomSource?.nodeIndex === 31)) {
    // The reading surface falls 0.1525m over 0.3992m toward the lower lip.
    const slope = Math.atan2(0.1525283, 0.3992364)
    const notebook = new THREE.Group()
    notebook.name = 'Lectern notebook'
    notebook.position.set(0.03, 1.4986364 - (3.33 - 3.143118) * Math.tan(slope), 3.33)
    notebook.rotation.x = slope
    object3d.add(notebook)
    for (const [name, y, height, surface] of [
      ['Notebook lower cover', 0.003, 0.006, plum],
      ['Notebook pages', 0.015, 0.018, cream],
      ['Notebook upper cover', 0.027, 0.006, plum],
    ]) {
      const mesh = add(name, cube, surface, [0, y, 0], [0.3, height, 0.27])
      notebook.add(mesh)
    }
    // Keep the level ledge and cup inside the existing podium collision footprint.
    add('Level pencil ledge', cube, wood, [0.3, 1.17, 3.63], [0.3, 0.04, 0.3])
    add('Pencil ledge bracket', cube, wood, [0.3, 1.09, 3.56], [0.045, 0.14, 0.14])
    const cupWall = own(new THREE.CylinderGeometry(0.055, 0.047, 0.13, 12, 1, true))
    const cupMaterial = own(cream.clone())
    cupMaterial.side = THREE.DoubleSide
    add('Pencil cup wall', cupWall, cupMaterial, [0.32, 1.255, 3.7], [1, 1, 1])
    const disk = own(new THREE.CylinderGeometry(0.047, 0.047, 0.008, 12))
    add('Pencil cup base', disk, cream, [0.32, 1.194, 3.7], [1, 1, 1])
    const shaft = own(new THREE.CylinderGeometry(0.006, 0.006, 0.23, 6))
    const tip = own(new THREE.ConeGeometry(0.006, 0.018, 6))
    for (let i = 0; i < 3; i++) {
      const x = 0.299 + i * 0.021
      const z = 3.7 + (i === 1 ? 0.012 : -0.01)
      add(`Pencil ${i + 1} shaft`, shaft, i === 1 ? plum : wood, [x, 1.313, z], [1, 1, 1])
      add(`Pencil ${i + 1} tip`, tip, graphite, [x, 1.437, z], [1, 1, 1])
    }
  }
  object3d.updateMatrixWorld(true)
  return {
    object3d,
    dispose() {
      object3d.removeFromParent()
      resources.forEach((resource) => resource.dispose())
    },
  }
}
