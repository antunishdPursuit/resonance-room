import * as THREE from 'three'

const CORE_STATE = {
  IDLE: 'idle',
  TALKING: 'talking',
  WALKING: 'walking',
  RUNNING: 'running',
}

export function createAvatarAnimationController({
  mixer,
  actions,
  transitionDuration = 0.22,
  idleVariationDelay = 18,
  idleVariationsEnabled = true,
  random = Math.random,
}) {
  let moving = false
  let running = false
  let speaking = false
  let currentAction = null
  let temporaryAction = null
  let temporaryState = null
  let temporaryQueue = []
  let temporaryOnComplete = null
  let idleElapsed = 0
  let idleVariations = []
  let previousIdleVariation = null
  let disposed = false

  function desiredCoreState() {
    if (moving) {
      return running ? CORE_STATE.RUNNING : CORE_STATE.WALKING
    }
    if (speaking) return CORE_STATE.TALKING
    return CORE_STATE.IDLE
  }

  function restoreAction(action, { repetitions = Infinity } = {}) {
    const loop = repetitions !== 1
    action.enabled = true
    action.paused = false
    action
      .reset()
      .setLoop(
        loop ? THREE.LoopRepeat : THREE.LoopOnce,
        repetitions,
      )
      .setEffectiveTimeScale(1)
      .setEffectiveWeight(1)
      .play()
  }

  function transitionTo(action, { repetitions = Infinity } = {}) {
    if (!action) return

    if (action === currentAction) {
      if (!action.enabled || action.paused || !action.isRunning()) {
        restoreAction(action, { repetitions })
      }
      return
    }

    restoreAction(action, { repetitions })
    if (currentAction) {
      currentAction.crossFadeTo(action, transitionDuration, true)
    }
    currentAction = action
  }

  function returnToCoreState({ completed = false } = {}) {
    const onComplete = completed ? temporaryOnComplete : null
    temporaryAction = null
    temporaryState = null
    temporaryQueue = []
    temporaryOnComplete = null
    idleElapsed = 0
    transitionTo(actions[desiredCoreState()])
    onComplete?.()
  }

  function handleFinished(event) {
    if (event.action !== temporaryAction) return
    const nextStep = temporaryQueue.shift()
    if (nextStep) {
      startTemporaryAction(nextStep.action, {
        repetitions: nextStep.repetitions,
        state: temporaryState,
      })
      return
    }
    returnToCoreState({ completed: true })
  }

  function interruptForMovement() {
    if (
      temporaryState === 'long-idle'
      || temporaryState === 'contextual'
      || temporaryState === 'preview'
    ) {
      returnToCoreState()
    }
  }

  function interruptForSpeech() {
    if (
      temporaryState === 'long-idle'
      || temporaryState === 'preview'
    ) {
      returnToCoreState()
    }
  }

  function chooseIdleVariation() {
    if (idleVariations.length === 0) return null
    if (idleVariations.length === 1) return idleVariations[0]

    const candidates = idleVariations.filter(
      action => action !== previousIdleVariation,
    )
    return candidates[Math.floor(random() * candidates.length)]
  }

  function startTemporaryAction(action, { repetitions, state }) {
    if (!action) return

    const restartCurrentAction = action === currentAction
    action.clampWhenFinished = Number.isFinite(repetitions)
    temporaryAction = action
    temporaryState = state
    if (restartCurrentAction) {
      restoreAction(action, { repetitions })
    } else {
      transitionTo(action, { repetitions })
    }
  }

  function playTemporaryAction(action, {
    repetitions,
    state,
    queue = [],
    onComplete = null,
  }) {
    temporaryQueue = [...queue]
    temporaryOnComplete = onComplete
    startTemporaryAction(action, { repetitions, state })
  }

  mixer.addEventListener('finished', handleFinished)
  transitionTo(actions[CORE_STATE.IDLE])

  return {
    setMoving(value, { running: nextRunning = false } = {}) {
      moving = Boolean(value)
      running = moving && Boolean(nextRunning)
      if (moving) interruptForMovement()
      if (!temporaryAction) {
        transitionTo(actions[desiredCoreState()])
      }
    },

    setSpeaking(value) {
      speaking = Boolean(value)
      if (speaking) {
        interruptForSpeech()
      }
      if (!temporaryAction) {
        transitionTo(actions[desiredCoreState()])
      }
    },

    playPreview(action, { loop = true, onComplete = null } = {}) {
      playTemporaryAction(action, {
        repetitions: loop ? Infinity : 1,
        state: 'preview',
        onComplete,
      })
    },

    playPreviewSequence(steps, { onComplete = null } = {}) {
      const availableSteps = steps.filter(step => step.action)
      const [firstStep, ...remainingSteps] = availableSteps
      if (!firstStep) return

      playTemporaryAction(firstStep.action, {
        repetitions: firstStep.repetitions,
        state: 'preview',
        queue: remainingSteps,
        onComplete,
      })
    },

    playContextual(action, { repetitions = 1 } = {}) {
      playTemporaryAction(action, {
        repetitions,
        state: 'contextual',
      })
    },

    returnToCoreState,

    setIdleVariations(value) {
      idleVariations = value
        .filter(Boolean)
        .map(variation => (
          Array.isArray(variation?.steps)
            ? variation
            : {
              id: variation,
              steps: [{ action: variation, repetitions: 1 }],
            }
        ))
        .filter(variation => (
          Array.isArray(variation.steps)
        && variation.steps.length > 0
        && variation.steps.every(step => step.action)
        ))
      previousIdleVariation = null
      idleElapsed = 0
    },

    update(delta) {
      if (
        idleVariationsEnabled
        && !temporaryAction
        && desiredCoreState() === CORE_STATE.IDLE
      ) {
        idleElapsed += delta
        if (idleElapsed >= idleVariationDelay) {
          const variation = chooseIdleVariation()
          if (variation) {
            const [firstStep, ...remainingSteps] = variation.steps
            previousIdleVariation = variation
            idleElapsed = 0
            playTemporaryAction(firstStep.action, {
              repetitions: firstStep.repetitions,
              state: 'long-idle',
              queue: remainingSteps,
            })
          }
        }
      } else if (desiredCoreState() !== CORE_STATE.IDLE) {
        idleElapsed = 0
      }

      mixer.update(delta)
    },

    getState() {
      if (temporaryState) return temporaryState
      return desiredCoreState()
    },

    dispose() {
      if (disposed) return
      disposed = true
      mixer.removeEventListener('finished', handleFinished)
      mixer.stopAllAction()
    },
  }
}
