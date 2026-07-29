import assert from 'node:assert/strict'
import test from 'node:test'

import {
  formatRecommendationBoardRows,
} from '../src/classroom/classroomRecommendationBoard.js'

test('lays out up to five recommendations in two columns', () => {
  const rows = formatRecommendationBoardRows([
    { title: 'One', artist: 'Artist 1' },
    { title: 'Two', artist: 'Artist 2' },
    { title: 'Three', artist: 'Artist 3' },
    { title: 'Four', artist: 'Artist 4' },
    { title: 'Five', artist: 'Artist 5' },
    { title: 'Six', artist: 'Artist 6' },
  ])

  assert.deepEqual(
    rows.map(({ index, column, row }) => ({ index, column, row })),
    [
      { index: 1, column: 0, row: 0 },
      { index: 2, column: 0, row: 1 },
      { index: 3, column: 0, row: 2 },
      { index: 4, column: 1, row: 0 },
      { index: 5, column: 1, row: 1 },
    ],
  )
})

test('normalizes incomplete labels and shortens long board text', () => {
  const [row] = formatRecommendationBoardRows([
    {
      title: 'A Very Long Song Title That Cannot Fit On One Board Row',
      artist: '',
    },
  ])

  assert.equal(row.title, 'A Very Long Song Title Th...')
  assert.equal(row.artist, 'Unknown artist')
})

test('returns no rows when recommendations are unavailable', () => {
  assert.deepEqual(formatRecommendationBoardRows(null), [])
  assert.deepEqual(formatRecommendationBoardRows([]), [])
})
