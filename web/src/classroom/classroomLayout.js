import * as THREE from 'three'

export const CLASSROOM_EXPANSION = Object.freeze({ side: 0.8, rear: 0.8, front: 0.4 })
const FRONT_FIXTURES = new Set([4, 6, 8, 10, 12, 14, 16, 21, 28, 29, 31, 33, 34, 36, 38, 40, 42])
const WINDOW_FIXTURES = new Set([44, 45, 47, 48])

// Only stretch the architectural shell. Furniture keeps its original geometry,
// scale and arrangement; wall-mounted fixtures translate with their wall.
export function applyClassroomLayout(classroomRoot, parser) {
  const meshes = []
  classroomRoot.traverse((mesh) => {
    if (mesh.isMesh) meshes.push([mesh, parser.associations.get(mesh)?.nodes])
  })
  const shell = meshes.find(([, node]) => node === 52)?.[0]
  if (!shell) return { dispose() {} }
  shell.geometry.computeBoundingBox()
  const bounds = shell.geometry.boundingBox
  const length = bounds.max.z - bounds.min.z
  const { side, rear, front } = CLASSROOM_EXPANSION
  const stretchZ = (z) =>
    bounds.min.z - rear + ((z - bounds.min.z) * (length + rear + front)) / length
  const originals = []
  for (const [mesh, node] of meshes) {
    if (node !== 52 && node !== 23 && !FRONT_FIXTURES.has(node) && !WINDOW_FIXTURES.has(node))
      continue
    originals.push({ mesh, geometry: mesh.geometry, position: mesh.position.clone() })
    if (node === 52 || WINDOW_FIXTURES.has(node)) {
      mesh.geometry = mesh.geometry.clone()
      const positions = mesh.geometry.attributes.position
      for (let i = 0; i < positions.count; i++) {
        positions.setXYZ(
          i,
          positions.getX(i) + (positions.getX(i) < 0 ? -side : side),
          positions.getY(i),
          stretchZ(positions.getZ(i)),
        )
      }
      positions.needsUpdate = true
      mesh.geometry.computeVertexNormals()
      mesh.geometry.computeBoundingBox()
      mesh.geometry.computeBoundingSphere()
    } else mesh.position.z += node === 23 ? -rear : front
  }
  classroomRoot.updateMatrixWorld(true)
  const board = meshes.find(([, node]) => node === 4)?.[0]
  return {
    side,
    rear,
    front,
    boardBottom: board ? new THREE.Box3().setFromObject(board).min.y : undefined,
    frontWallZ: board ? stretchZ(new THREE.Box3().setFromObject(board).max.z - front) : undefined,
    dispose() {
      for (const { mesh, geometry, position } of originals) {
        if (mesh.geometry !== geometry) mesh.geometry.dispose()
        mesh.geometry = geometry
        mesh.position.copy(position)
      }
      classroomRoot.updateMatrixWorld(true)
    },
  }
}
