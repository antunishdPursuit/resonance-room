import assert from 'node:assert/strict'
import test from 'node:test'

import {
  AVATAR_ANIMATION_ASSIGNMENTS,
  getAnimationPreviewSequence,
  LONG_IDLE_VARIATIONS,
} from '../src/animations/animationPreview.js'

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
