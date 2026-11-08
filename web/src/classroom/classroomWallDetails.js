import * as THREE from 'three'

const CREAM = '#d4c5ab'
const PLUM = '#765970'
const TEAL = '#8bd4df'

function createArtworkTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 1024
  const c = canvas.getContext('2d')
  c.fillStyle = CREAM
  c.fillRect(0, 0, 1024, 1024)
  c.fillStyle = '#28420f'
  c.fillRect(0, 0, 512, 512)
  c.strokeStyle = CREAM
  c.fillStyle = CREAM
  c.lineWidth = 3
  for (let i = 0; i < 5; i++) {
    c.beginPath()
    c.moveTo(55, 132 + i * 22)
    c.lineTo(457, 132 + i * 22)
    c.stroke()
  }
  for (let i = 0; i < 4; i++) {
    const x = 135 + i * 80
    const y = 209 - i * 11
    c.beginPath()
    c.ellipse(x, y, 12, 8, -0.3, 0, Math.PI * 2)
    c.fill()
    c.beginPath()
    c.moveTo(x + 10, y)
    c.lineTo(x + 10, y - 68)
    c.stroke()
  }
  c.lineWidth = 6
  c.beginPath()
  c.arc(340, 364, 57, Math.PI, Math.PI * 2)
  c.stroke()
  c.fillRect(278, 358, 15, 48)
  c.fillRect(387, 358, 15, 48)
  // Cream prints: a musical phrase and a small equalizer, without font dependencies.
  c.strokeStyle = PLUM
  c.fillStyle = PLUM
  c.lineWidth = 8
  for (const [x, y] of [
    [700, 285],
    [808, 244],
  ]) {
    c.beginPath()
    c.ellipse(x, y, 28, 18, -0.3, 0, Math.PI * 2)
    c.fill()
    c.beginPath()
    c.moveTo(x + 23, y)
    c.lineTo(x + 23, y - 137)
    c.stroke()
  }
  c.beginPath()
  c.moveTo(723, 148)
  c.lineTo(831, 107)
  c.stroke()
  for (let i = 0; i < 5; i++) {
    c.fillRect(128 + i * 52, 850 - [45, 100, 155, 100, 65][i], 30, [45, 100, 155, 100, 65][i])
  }
  c.strokeStyle = TEAL
  c.lineWidth = 10
  for (const [x, y] of [
    [620, 362],
    [80, 910],
  ]) {
    c.beginPath()
    c.moveTo(x, y)
    c.bezierCurveTo(x + 80, y + 45, x + 190, y - 45, x + 290, y)
    c.stroke()
  }
  c.fillStyle = PLUM
  c.fillRect(512, 512, 512, 512)
  for (const [x, y, width, height, color] of [
    [560, 560, 180, 210, CREAM],
    [780, 600, 180, 180, '#b88780'],
    [650, 810, 200, 160, '#b9a9a3'],
  ]) {
    c.fillStyle = color
    c.fillRect(x, y, width, height)
    c.fillStyle = '#443540'
    for (let line = 0; line < 5; line++) c.fillRect(x + 20, y + 48 + line * 20, width - 40, 3)
    c.fillStyle = CREAM
    c.beginPath()
    c.arc(x + width / 2, y + 12, 6, 0, Math.PI * 2)
    c.fill()
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

export function createWallDetails(classroomMeshes, { createTexture = createArtworkTexture } = {}) {
  const object3d = new THREE.Group()
  object3d.name = 'Classroom music and wall artwork'
  const resources = new Set()
  const own = (resource) => (resources.add(resource), resource)
  const has = (node) =>
    classroomMeshes.some((mesh) => mesh.userData.classroomSource?.nodeIndex === node)
  if (has(6) || has(52)) {
    const texture = own(createTexture())
    const art = own(new THREE.MeshBasicMaterial({ map: texture }))
    const frameMaterial = own(new THREE.MeshStandardMaterial({ color: 0x76513f, roughness: 0.8 }))
    const cube = own(new THREE.BoxGeometry(1, 1, 1))
    const frames = []
    const panel = (name, position, width, height, rotation, tile, framed) => {
      const geometry = own(new THREE.PlaneGeometry(width, height))
      const uv = geometry.attributes.uv
      for (let i = 0; i < uv.count; i++)
        uv.setXY(i, uv.getX(i) / 2 + tile[0] / 2, uv.getY(i) / 2 + tile[1] / 2)
      const mesh = new THREE.Mesh(geometry, art)
      mesh.name = name
      mesh.position.set(...position)
      mesh.rotation.y = rotation
      object3d.add(mesh)
      if (framed) {
        for (const offset of [-1, 1]) {
          frames.push([
            position[0] - 0.008,
            position[1] + offset * (height / 2 + 0.015),
            position[2],
            0.035,
            0.03,
            width + 0.06,
          ])
          frames.push([
            position[0] - 0.008,
            position[1],
            position[2] + offset * (width / 2 + 0.015),
            0.035,
            height,
            0.03,
          ])
        }
      }
    }
    if (has(6))
      panel('Auxiliary chalk music', [-3.097, 1.648, 4.749], 1.25, 1.1, Math.PI, [0, 1], false)
    if (has(52)) {
      // Keep the artwork above the lowered corridor glazing and below the ceiling.
      panel('Framed music phrase', [-3.91, 2.75, 3.25], 0.4, 0.48, Math.PI / 2, [1, 1], true)
      panel('Framed equalizer', [-3.91, 2.75, 2.65], 0.4, 0.48, Math.PI / 2, [0, 0], true)
      panel('Classroom notices', [-3.91, 2.75, 1.72], 0.54, 0.52, Math.PI / 2, [1, 0], true)
    }
    if (frames.length) {
      const mesh = new THREE.InstancedMesh(cube, frameMaterial, frames.length)
      mesh.name = 'Wall artwork frames'
      const transform = new THREE.Object3D()
      frames.forEach(([x, y, z, w, h, d], i) => {
        transform.position.set(x, y, z)
        transform.scale.set(w, h, d)
        transform.updateMatrix()
        mesh.setMatrixAt(i, transform.matrix)
      })
      mesh.instanceMatrix.needsUpdate = true
      object3d.add(mesh)
      own(mesh)
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
