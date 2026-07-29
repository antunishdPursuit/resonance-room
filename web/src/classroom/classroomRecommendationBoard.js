import * as THREE from 'three'
import { isSongSelected } from '../ui/songSelection.js'

const CANVAS_WIDTH = 2048
const CANVAS_HEIGHT = 640
const MAX_RECOMMENDATIONS = 6
const COLUMN_X = [72, 1056]
const ROW_Y = [140, 304, 468]
const CARD_WIDTH = 920
const CARD_HEIGHT = 132

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
      song,
    }))
}

export function getRecommendationBoardRowPlacement(row) {
  const pixelX = COLUMN_X[row.column]
  const pixelY = ROW_Y[row.row]

  return {
    centerX: (
      ((pixelX + (CARD_WIDTH / 2)) / CANVAS_WIDTH) - 0.5
    ) * RECOMMENDATION_BOARD_PLACEMENT.width,
    centerY: (
      0.5 - ((pixelY + (CARD_HEIGHT / 2)) / CANVAS_HEIGHT)
    ) * RECOMMENDATION_BOARD_PLACEMENT.height,
    width: (CARD_WIDTH / CANVAS_WIDTH) * RECOMMENDATION_BOARD_PLACEMENT.width,
    height: (CARD_HEIGHT / CANVAS_HEIGHT) * RECOMMENDATION_BOARD_PLACEMENT.height,
  }
}

function drawBoard(context, rows, hoveredRowIndex, selectedSongs) {
  context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
  if (rows.length === 0) return

  context.textBaseline = 'middle'
  context.shadowColor = 'rgba(0, 0, 0, 0.8)'
  context.shadowBlur = 8

  context.fillStyle = '#f9a8d4'
  context.font = '700 48px Arial, sans-serif'
  context.textAlign = 'center'
  context.fillText("ESME'S PICKS", CANVAS_WIDTH / 2, 58)

  rows.forEach((row, rowIndex) => {
    const x = COLUMN_X[row.column]
    const y = ROW_Y[row.row]
    const selected = isSongSelected(selectedSongs, row.song)
    const hovered = rowIndex === hoveredRowIndex

    context.shadowBlur = 0
    context.fillStyle = hovered
      ? 'rgba(124, 58, 237, 0.58)'
      : selected
        ? 'rgba(244, 114, 182, 0.34)'
        : 'rgba(17, 10, 16, 0.38)'
    context.fillRect(x, y, CARD_WIDTH, CARD_HEIGHT)

    if (hovered || selected) {
      context.strokeStyle = hovered ? '#fff7ed' : '#f9a8d4'
      context.lineWidth = 4
      context.strokeRect(x + 2, y + 2, CARD_WIDTH - 4, CARD_HEIGHT - 4)
    }

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

    context.fillStyle = selected ? '#f472b6' : '#f9a8d4'
    context.font = '700 42px Arial, sans-serif'
    context.textAlign = 'center'
    context.fillText(selected ? '♥' : '♡', x + CARD_WIDTH - 48, y + 66)
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
  mesh.name = 'recommendation-board-surface'
  mesh.renderOrder = 1
  mesh.visible = false

  const object3d = new THREE.Group()
  object3d.name = 'recommendation-board'
  object3d.position.set(...RECOMMENDATION_BOARD_PLACEMENT.position)
  object3d.rotation.y = RECOMMENDATION_BOARD_PLACEMENT.rotationY
  object3d.add(mesh)

  const firstPlacement = getRecommendationBoardRowPlacement({
    column: 0,
    row: 0,
  })
  const hitGeometry = new THREE.PlaneGeometry(
    firstPlacement.width,
    firstPlacement.height,
  )
  const hitMaterial = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    colorWrite: false,
    depthWrite: false,
    depthTest: false,
    side: THREE.DoubleSide,
  })
  const hitTargets = Array.from({ length: MAX_RECOMMENDATIONS }, (_, index) => {
    const row = {
      column: index < 3 ? 0 : 1,
      row: index < 3 ? index : index - 3,
    }
    const placement = getRecommendationBoardRowPlacement(row)
    const target = new THREE.Mesh(hitGeometry, hitMaterial)
    target.name = `recommendation-board-hit-${index + 1}`
    target.position.set(placement.centerX, placement.centerY, 0.002)
    target.visible = false
    target.userData.recommendationBoardRowIndex = index
    target.userData.recommendationBoardSong = null
    object3d.add(target)
    return target
  })

  let rows = []
  let hoveredRowIndex = null
  let selectedSongs = []

  function redraw() {
    drawBoard(context, rows, hoveredRowIndex, selectedSongs)
    texture.needsUpdate = true
  }

  return {
    object3d,
    update(recommendations) {
      rows = formatRecommendationBoardRows(recommendations)
      if (hoveredRowIndex >= rows.length) hoveredRowIndex = null

      hitTargets.forEach((target, index) => {
        const row = rows[index]
        target.visible = Boolean(row)
        target.userData.recommendationBoardSong = row?.song ?? null
      })

      redraw()
      mesh.visible = rows.length > 0
    },
    getHitTargets() {
      return hitTargets.filter(target => target.visible)
    },
    setHoveredRow(rowIndex) {
      const nextRowIndex = Number.isInteger(rowIndex) && rows[rowIndex]
        ? rowIndex
        : null
      if (hoveredRowIndex === nextRowIndex) return
      hoveredRowIndex = nextRowIndex
      redraw()
    },
    setSelectedSongs(songs) {
      selectedSongs = Array.isArray(songs) ? songs : []
      redraw()
    },
    dispose() {
      geometry.dispose()
      material.dispose()
      texture.dispose()
      hitGeometry.dispose()
      hitMaterial.dispose()
    },
  }
}
