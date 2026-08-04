import assert from 'node:assert/strict'
import test from 'node:test'

import {
  formatRecommendationBoardRows,
  getRecommendationBoardPrompt,
  getRecommendationBoardRowPlacement,
  loadRecommendationBoardFonts,
  resetRecommendationBoardFontLoadCache,
} from '../src/classroom/classroomRecommendationBoard.js'

test('maps six recommendations to board rows and hit areas', () => {
  const recommendations = [
    { title: 'One', artist: 'Artist 1' },
    { title: 'Two', artist: 'Artist 2' },
    { title: 'Three', artist: 'Artist 3' },
    { title: 'Four', artist: 'Artist 4' },
    { title: 'Five', artist: 'Artist 5' },
    { title: 'Six', artist: 'Artist 6' },
    { title: 'Seven', artist: 'Artist 7' },
  ]
  const rows = formatRecommendationBoardRows(recommendations)

  assert.deepEqual(
    rows.map(({ index, column, row }) => ({ index, column, row })),
    [
      { index: 1, column: 0, row: 0 },
      { index: 2, column: 0, row: 1 },
      { index: 3, column: 0, row: 2 },
      { index: 4, column: 1, row: 0 },
      { index: 5, column: 1, row: 1 },
      { index: 6, column: 1, row: 2 },
    ],
  )
  assert.equal(rows[0].song, recommendations[0])

  const left = getRecommendationBoardRowPlacement({ column: 0, row: 0 })
  const right = getRecommendationBoardRowPlacement({ column: 1, row: 0 })
  const lower = getRecommendationBoardRowPlacement({ column: 0, row: 2 })

  assert.ok(left.centerX < right.centerX)
  assert.ok(left.centerY > lower.centerY)
  assert.ok(left.width > 0)
  assert.ok(left.height > 0)
})

test('normalizes board labels and handles missing recommendations', () => {
  const [row] = formatRecommendationBoardRows([
    {
      title: 'A Very Long Song Title That Cannot Fit On One Board Row',
      artist: '',
    },
  ])

  assert.equal(row.title, 'A Very Long Song Title Th...')
  assert.equal(row.artist, 'Unknown artist')
  assert.deepEqual(formatRecommendationBoardRows(null), [])
  assert.deepEqual(formatRecommendationBoardRows([]), [])
})

test('shows the proximity prompt only when board interaction is unavailable', () => {
  assert.equal(
    getRecommendationBoardPrompt(false),
    'MOVE CLOSER TO INTERACT',
  )
  assert.equal(getRecommendationBoardPrompt(true), '')
})

test('loads the approved board fonts once per font-face set', async () => {
  resetRecommendationBoardFontLoadCache()

  const requestedFonts = []
  const fontFaceSet = {
    load(font) {
      requestedFonts.push(font)
      return Promise.resolve([font])
    },
  }

  assert.equal(await loadRecommendationBoardFonts(fontFaceSet), true)
  assert.equal(await loadRecommendationBoardFonts(fontFaceSet), true)
  assert.deepEqual(requestedFonts, [
    '700 48px "Space Grotesk", ui-sans-serif, system-ui, sans-serif',
    '600 24px Inter, ui-sans-serif, system-ui, sans-serif',
    '700 38px Inter, ui-sans-serif, system-ui, sans-serif',
    '400 28px Inter, ui-sans-serif, system-ui, sans-serif',
    '700 42px Inter, ui-sans-serif, system-ui, sans-serif',
  ])
})
