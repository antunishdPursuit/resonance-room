export const ANIMATION_PREVIEW_GROUPS = [
  {
    label: 'Greeting and idle candidates',
    names: [
      'Interact',
      'Idle_Loop',
      'Idle_Talking_Loop',
      'Idle_Torch_Loop',
      'Dance_Loop',
      'A_TPose',
    ],
  },
  {
    label: 'Existing movement',
    names: [
      'Walk_Loop',
      'Jog_Fwd_Loop',
    ],
  },
  {
    label: 'Multi-part sequences',
    names: [
      'Spell_Sequence',
      'Punch_Sequence',
    ],
  },
]

export const ANIMATION_PREVIEW_SEQUENCES = {
  Spell_Sequence: [
    { name: 'Spell_Simple_Enter', repetitions: 1 },
    { name: 'Spell_Simple_Idle_Loop', repetitions: 3 },
    { name: 'Spell_Simple_Shoot', repetitions: 1 },
    { name: 'Spell_Simple_Exit', repetitions: 1 },
  ],
  Punch_Sequence: [
    { name: 'Punch_Cross', repetitions: 1 },
    { name: 'Punch_Jab', repetitions: 1 },
    { name: 'Punch_Cross', repetitions: 1 },
    { name: 'Punch_Jab', repetitions: 1 },
  ],
}

const ANIMATION_PREVIEW_LABELS = {
  Spell_Sequence: 'Spell — enter, idle, cast, exit',
  Punch_Sequence: 'Punch — cross, jab × 2',
}

export const AVATAR_ANIMATION_ASSIGNMENTS = {
  idle: 'Idle_Loop',
  talking: 'Idle_Talking_Loop',
  walking: 'Walk_Loop',
  running: 'Jog_Fwd_Loop',
  openingGreeting: 'Dance_Loop',
  interacting: 'Interact',
}

export const LONG_IDLE_VARIATIONS = [
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
    steps: ANIMATION_PREVIEW_SEQUENCES.Spell_Sequence,
  },
  {
    id: 'Punch_Sequence',
    steps: ANIMATION_PREVIEW_SEQUENCES.Punch_Sequence,
  },
  {
    id: 'A_TPose',
    steps: [{ name: 'A_TPose', repetitions: 1 }],
  },
]

export function getAnimationPreviewLabel(animationName) {
  return ANIMATION_PREVIEW_LABELS[animationName] ?? animationName
}

export function getAnimationPreviewSequence(animationName) {
  return ANIMATION_PREVIEW_SEQUENCES[animationName] ?? null
}

export function isAnimationPreviewSequence(animationName) {
  return Boolean(getAnimationPreviewSequence(animationName))
}

export function getAvailableAnimationPreviewGroups(animationNames) {
  const availableNames = new Set(animationNames)
  return ANIMATION_PREVIEW_GROUPS
    .map(group => ({
      ...group,
      names: group.names.filter((name) => {
        const sequence = getAnimationPreviewSequence(name)
        return sequence
          ? sequence.every(step => availableNames.has(step.name))
          : availableNames.has(name)
      }),
    }))
    .filter(group => group.names.length > 0)
}

export function shouldLoopAnimationPreview(animationName) {
  return !isAnimationPreviewSequence(animationName)
    && animationName.endsWith('_Loop')
}
