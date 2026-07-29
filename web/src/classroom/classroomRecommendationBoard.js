import * as THREE from 'three'

const CANVAS_WIDTH = 2048
const CANVAS_HEIGHT = 640
const MAX_RECOMMENDATIONS = 5

export const RECOMMENDATION_BOARD_PLACEMENT = Object.freeze({
  position: Object.freeze([0.159, 1.648, 4.58]),
  rotationY: Math.PI,
  width: 4.08,
  height: 1.14,
})

function shortenText(value, maxLength) {
  const text = String(value ?? '').trim()
  if (text.length <= maxLength) return text
  return `${text.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`
}

export function formatRecommendationBoardRows(recommendations) {
  if (!Array.isArray(recommendations)) return []

  return recommendations
    .filter(song => song && (song.title || song.artist))
    .slice(0, MAX_RECOMMENDATIONS)
    .map((song, index) => ({
      index: index + 1,
      column: index < 3 ? 0 : 1,
      row: index < 3 ? index : index - 3,
      title: shortenText(song.title || 'Untitled track', 28),
      artist: shortenText(song.artist || 'Unknown artist', 24),
    }))
}

function drawBoard(context, rows) {
  context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
  if (rows.length === 0) return

  context.textBaseline = 'middle'
  context.shadowColor = 'rgba(0, 0, 0, 0.8)'
  context.shadowBlur = 8

  context.fillStyle = '#f9a8d4'
  context.font = '700 48px Arial, sans-serif'
  context.textAlign = 'center'
  context.fillText("ESME'S PICKS", CANVAS_WIDTH / 2, 58)

  const columnX = [72, 1056]
  const rowY = [140, 304, 468]
  const cardWidth = 920
  const cardHeight = 132

  rows.forEach((row) => {
    const x = columnX[row.column]
    const y = rowY[row.row]

    context.shadowBlur = 0
    context.fillStyle = 'rgba(17, 10, 16, 0.38)'
    context.fillRect(x, y, cardWidth, cardHeight)

    context.shadowBlur = 6
    context.fillStyle = '#f9a8d4'
    context.font = '700 38px Arial, sans-serif'
    context.textAlign = 'left'
    context.fillText(`${row.index}.`, x + 28, y + 42)

    context.fillStyle = '#fff7ed'
    context.font = '700 38px Arial, sans-serif'
    context.fillText(row.title, x + 90, y + 42)

    context.fillStyle = '#f3d7e5'
    context.font = '400 28px Arial, sans-serif'
    context.fillText(row.artist, x + 90, y + 92)
  })
}

export function createClassroomRecommendationBoard() {
  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_WIDTH
  canvas.height = CANVAS_HEIGHT

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Recommendation board requires a 2D canvas context.')
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter

  const geometry = new THREE.PlaneGeometry(
    RECOMMENDATION_BOARD_PLACEMENT.width,
    RECOMMENDATION_BOARD_PLACEMENT.height,
  )
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = 'recommendation-board'
  mesh.position.set(...RECOMMENDATION_BOARD_PLACEMENT.position)
  mesh.rotation.y = RECOMMENDATION_BOARD_PLACEMENT.rotationY
  mesh.renderOrder = 1
  mesh.visible = false

  return {
    object3d: mesh,
    update(recommendations) {
      const rows = formatRecommendationBoardRows(recommendations)
      drawBoard(context, rows)
      texture.needsUpdate = true
      mesh.visible = rows.length > 0
    },
    dispose() {
      geometry.dispose()
      material.dispose()
      texture.dispose()
    },
  }
}
