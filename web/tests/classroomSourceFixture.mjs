import { readFileSync } from 'node:fs'
import * as THREE from 'three'

// Decode retained source buffers, not a cached generated room or bounding-box stand-in.
export function classroomFixture() {
  const source = JSON.parse(
    readFileSync(new URL('../public/Classroom/scene.gltf', import.meta.url)),
  )
  const root = new THREE.Group()
  const associations = new Map()
  const values = (id) => {
    const a = source.accessors[id]
    const view = source.bufferViews[a.bufferView]
    const buffer = readFileSync(
      new URL(`../public/Classroom/${source.buffers[view.buffer].uri}`, import.meta.url),
    )
    const n = { VEC3: 3, VEC2: 2, SCALAR: 1 }[a.type]
    const bytes = { 5121: 1, 5123: 2, 5125: 4, 5126: 4 }[a.componentType]
    return Array.from({ length: a.count * n }, (_, i) => {
      const offset =
        (view.byteOffset ?? 0) +
        (a.byteOffset ?? 0) +
        Math.floor(i / n) * (view.byteStride ?? n * bytes) +
        (i % n) * bytes
      return a.componentType === 5126
        ? buffer.readFloatLE(offset)
        : bytes === 4
          ? buffer.readUInt32LE(offset)
          : bytes === 2
            ? buffer.readUInt16LE(offset)
            : buffer.readUInt8(offset)
    })
  }
  source.nodes.forEach((node, index) => {
    if (node.mesh === undefined) return
    for (const p of source.meshes[node.mesh].primitives) {
      const geometry = new THREE.BufferGeometry()
      for (const [key, id] of Object.entries(p.attributes)) {
        const name = { POSITION: 'position', NORMAL: 'normal', TEXCOORD_0: 'uv' }[key]
        if (name)
          geometry.setAttribute(
            name,
            new THREE.Float32BufferAttribute(values(id), name === 'uv' ? 2 : 3),
          )
      }
      if (p.indices !== undefined) geometry.setIndex(values(p.indices))
      const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }))
      root.add(mesh)
      associations.set(mesh, { nodes: index })
    }
  })
  return { root, parser: { associations } }
}
