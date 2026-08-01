import assert from 'node:assert/strict'
import test from 'node:test'

import {
  AVATAR_ANIMATION_ASSIGNMENTS,
  getAvailableAnimationPreviewGroups,
  getAnimationPreviewLabel,
  getAnimationPreviewSequence,
  isAnimationPreviewSequence,
  LONG_IDLE_VARIATIONS,
  shouldLoopAnimationPreview,
} from '../src/animations/animationPreview.js'

test('offers only compatible greeting, idle, and movement previews', () => {
  const groups = getAvailableAnimationPreviewGroups([
    'A_TPose',
    'Crouch_Idle_Loop',
    'Dance_Loop',
    'Death01',
    'Idle_Loop',
    'Interact',
    'Jump_Land',
    'Pistol_Aim_Neutral',
    'Spell_Simple_Enter',
    'Jog_Fwd_Loop',
    'Sprint_Loop',
    'Walk_Loop',
  ])

  assert.deepEqual(groups, [
    {
      label: 'Greeting and idle candidates',
      names: ['Interact', 'Idle_Loop', 'Dance_Loop', 'A_TPose'],
    },
    {
      label: 'Existing movement',
      names: ['Walk_Loop', 'Jog_Fwd_Loop'],
    },
  ])
})

test('repeats loop clips but plays one-shot candidates once', () => {
  assert.equal(shouldLoopAnimationPreview('Idle_Loop'), true)
  assert.equal(shouldLoopAnimationPreview('Interact'), false)
  assert.equal(shouldLoopAnimationPreview('Sitting_Sequence'), false)
})

test('offers the approved spell and punch sequences when available', () => {
  const groups = getAvailableAnimationPreviewGroups([
    'Spell_Simple_Enter',
    'Spell_Simple_Idle_Loop',
    'Spell_Simple_Shoot',
    'Spell_Simple_Exit',
    'Punch_Cross',
    'Punch_Jab',
  ])

  assert.deepEqual(groups, [
    {
      label: 'Multi-part sequences',
      names: ['Spell_Sequence', 'Punch_Sequence'],
    },
  ])
  assert.equal(isAnimationPreviewSequence('Punch_Sequence'), true)
  assert.equal(
    getAnimationPreviewLabel('Punch_Sequence'),
    'Punch — cross, jab × 2',
  )
  assert.deepEqual(
    getAnimationPreviewSequence('Punch_Sequence').map(step => step.name),
    ['Punch_Cross', 'Punch_Jab', 'Punch_Cross', 'Punch_Jab'],
  )
  assert.equal(getAnimationPreviewSequence('Spell_Sequence').length, 4)
})

test('records the approved core, interaction, and idle assignments', () => {
  assert.deepEqual(AVATAR_ANIMATION_ASSIGNMENTS, {
    idle: 'Idle_Loop',
    talking: 'Idle_Talking_Loop',
    walking: 'Walk_Loop',
    running: 'Jog_Fwd_Loop',
    openingGreeting: 'Dance_Loop',
    interacting: 'Interact',
  })
  assert.deepEqual(LONG_IDLE_VARIATIONS, [
    {
      id: 'Idle_Torch_Loop',
      steps: [{ name: 'Idle_Torch_Loop', repetitions: 3 }],
    },
    {
      id: 'Dance_Loop',
      steps: [{ name: 'Dance_Loop', repetitions: 3 }],
    },
    {
      id: 'Spell_Sequence',
      steps: getAnimationPreviewSequence('Spell_Sequence'),
    },
    {
      id: 'Punch_Sequence',
      steps: getAnimationPreviewSequence('Punch_Sequence'),
    },
    {
      id: 'A_TPose',
      steps: [{ name: 'A_TPose', repetitions: 1 }],
    },
  ])
})
