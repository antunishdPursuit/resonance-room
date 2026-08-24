import { getEntryState } from '../ui/mobileControls.js'

function PhoneRotationGraphic() {
  return (
    <div className="phone-rotation" aria-hidden="true">
      <span className="phone-rotation__device" />
      <span className="phone-rotation__arrow">&#8635;</span>
    </div>
  )
}

function ControlGuide({ isPhone }) {
  const controls = isPhone
    ? [
        ['Move Riri', 'Drag to move. Push to the edge to run.'],
        ['Camera', 'The camera follows Riri automatically.'],
      ]
    : [
        ['Move Riri', 'Use WASD or the arrow keys. Hold Shift to run.'],
        ['Camera', 'The camera follows Riri automatically.'],
      ]

  return (
    <div className="experience-entry__controls" aria-label="Player controls">
      {controls.map(([label, help], index) => (
        <div className="experience-entry__control" key={label}>
          <span className="experience-entry__control-mark" aria-hidden="true">
            {index + 1}
          </span>
          <span>
            <strong>{label}</strong>
            <small>{help}</small>
          </span>
        </div>
      ))}
    </div>
  )
}

export function ExperienceEntryScreen({
  assetsReady,
  entryStarted,
  fading,
  isPhone,
  isLandscape,
  isStatic,
  onReady,
}) {
  const entryState = getEntryState({
    requiresLandscape: isPhone,
    isLandscape,
    assetsReady,
    entryStarted,
  })

  if (entryState === 'rotate-to-start' || entryState === 'rotate-to-continue') {
    return (
      <div
        className="loading-screen loading-screen--experience mobile-orientation-gate"
        data-fading={fading}
        role="dialog"
        aria-modal="true"
        aria-labelledby="orientation-title"
      >
        <PhoneRotationGraphic />
        <div className="loading-screen__copy experience-entry__copy">
          <div className="loading-screen__title" id="orientation-title">
            Turn your phone sideways
          </div>
          <p className="loading-screen__status">
            Resonance Room is designed to play horizontally.
          </p>
        </div>
        <button className="button button--primary experience-entry__ready" disabled>
          Rotate phone
        </button>
      </div>
    )
  }

  const buttonLabel = entryStarted
    ? 'Entering…'
    : assetsReady
      ? 'Ready'
      : 'Loading…'
  const status = entryStarted
    ? 'Opening the classroom…'
    : assetsReady
      ? 'The classroom is ready when you are.'
      : 'Preparing the classroom…'

  return (
    <div
      className="loading-screen loading-screen--experience experience-entry"
      data-fading={fading}
      role="dialog"
      aria-modal="true"
      aria-labelledby="experience-entry-title"
    >
      <div className="experience-entry__layout">
        <div className="experience-entry__heading">
          <div className="loading-screen__title" id="experience-entry-title">
            Resonance Room
          </div>
          <p className="loading-screen__status" role="status" aria-live="polite">
            {status}
          </p>
        </div>

        <ControlGuide isPhone={isPhone} />

        <p className="experience-entry__demo" role="note">
          <strong>{isStatic ? 'Static demo' : 'Backend mode'}</strong>
          {isStatic
            ? 'Recommendations use the built-in 36-song catalog.'
            : 'Recommendations use the connected classroom service.'}
        </p>

        <button
          className="button button--primary experience-entry__ready"
          data-ready={assetsReady && !entryStarted}
          disabled={!assetsReady || entryStarted}
          onClick={onReady}
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  )
}

export function OrientationGate() {
  return (
    <div
      className="loading-screen loading-screen--experience mobile-orientation-gate"
      role="dialog"
      aria-modal="true"
      aria-labelledby="orientation-resume-title"
    >
      <PhoneRotationGraphic />
      <div className="loading-screen__copy experience-entry__copy">
        <div className="loading-screen__title" id="orientation-resume-title">
          Turn your phone sideways
        </div>
        <p className="loading-screen__status">
          Return to landscape to continue playing.
        </p>
      </div>
    </div>
  )
}

export function ControlsMenu({
  cameraMode,
  closeLabel = 'Close',
  isPhone,
  isStatic,
  movementReady,
  onCameraModeChange,
  onClose,
  onResetCamera,
  onToggleVoice,
  open,
  voiceEnabled,
}) {
  if (!open) return null

  const freeCamera = cameraMode === 'free'

  return (
    <section className="controls-menu" aria-label="Controls">
      <div className="controls-menu__heading">
        <strong>Controls</strong>
        <button className="text-button" onClick={onClose}>{closeLabel}</button>
      </div>

      <dl className="controls-menu__guide">
        <div><dt>Move</dt><dd>{isPhone ? 'Hold and drag the joystick' : 'WASD or arrow keys'}</dd></div>
        <div>
          <dt>Run</dt>
          <dd>{isPhone ? 'Push the joystick to its outer edge' : 'Hold Shift while moving'}</dd>
        </div>
        {!freeCamera && <div><dt>Camera</dt><dd>Recenters behind Riri after movement</dd></div>}
        {freeCamera && <div><dt>Look</dt><dd>{isPhone ? 'Drag the right side' : 'Drag the classroom'}</dd></div>}
        {freeCamera && !isPhone && <div><dt>Zoom</dt><dd>Use the mouse wheel</dd></div>}
      </dl>

      <fieldset className="controls-menu__camera">
        <legend>Camera mode</legend>
        <div className="controls-menu__camera-options">
          <button
            className={`button button--secondary ${!freeCamera ? 'button--active' : ''}`}
            aria-pressed={!freeCamera}
            onClick={() => onCameraModeChange('follow')}
          >
            Follow
          </button>
          <button
            className={`button button--secondary ${freeCamera ? 'button--active' : ''}`}
            aria-pressed={freeCamera}
            onClick={() => onCameraModeChange('free')}
          >
            Free
          </button>
        </div>
        <p>
          {freeCamera
            ? 'Move the view yourself. Follow restores the fixed camera.'
            : 'Recommended. The view stays stable while you move, then recenters behind Riri.'}
        </p>
      </fieldset>

      <div className="controls-menu__actions">
        <button
          className={`button button--secondary ${voiceEnabled ? 'button--active' : ''}`}
          aria-pressed={voiceEnabled}
          onClick={onToggleVoice}
        >
          Voice: {voiceEnabled ? 'On' : 'Off'}
        </button>
        {freeCamera && (
          <button
            className="button button--secondary"
            disabled={!movementReady}
            onClick={onResetCamera}
          >
            Reset camera
          </button>
        )}
      </div>

      <p className="controls-menu__demo" role="note">
        <strong>{isStatic ? 'Static demo' : 'Backend mode'}</strong>
        {isStatic
          ? 'Recommendations use the built-in 36-song catalog. Voice stays in the browser.'
          : 'Recommendations and optional speech use FastAPI, with browser voice available.'}
      </p>
    </section>
  )
}

export function MobileUtilityMenu({
  likedCount,
  onClose,
  onOpenControls,
  onOpenLiked,
  onOpenTranscript,
  open,
}) {
  if (!open) return null

  return (
    <section className="mobile-utility-menu" aria-label="Menu">
      <div className="mobile-utility-menu__heading">
        <strong>Menu</strong>
        <button className="text-button" onClick={onClose}>Close</button>
      </div>
      <div className="mobile-utility-menu__actions">
        <button className="button button--secondary" onClick={onOpenTranscript}>
          Transcript
        </button>
        <button className="button button--secondary" onClick={onOpenLiked}>
          Liked songs ({likedCount})
        </button>
        <button className="button button--secondary" onClick={onOpenControls}>
          Controls
        </button>
      </div>
    </section>
  )
}

export function VoiceReminder({ onDismiss, onOpenControls }) {
  return (
    <aside className="voice-reminder" aria-label="Voice is off" role="status">
      <div>
        <strong>Voice is off</strong>
        <span>Open Controls if you want to hear Riri speak.</span>
      </div>
      <div className="voice-reminder__actions">
        <button className="button button--primary" onClick={onOpenControls}>
          Open Controls
        </button>
        <button className="button button--secondary" onClick={onDismiss}>
          Not now
        </button>
      </div>
    </aside>
  )
}
