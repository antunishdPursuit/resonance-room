import RoomLoading from './RoomLoading.jsx'

function PhoneRotationGraphic() {
  return (
    <div className="phone-rotation" aria-hidden="true">
      <span className="phone-rotation__device" />
      <span className="phone-rotation__arrow">&#8635;</span>
    </div>
  )
}

export function ExperienceEntryScreen({
  fading,
  isPhone,
  isLandscape,
  failed,
  ready,
  onContinue,
  onBack,
}) {
  return (
    <RoomLoading
      fading={fading}
      rotate={isPhone && !isLandscape}
      failed={failed}
      ready={ready}
      onContinue={onContinue}
      onBack={onBack}
    />
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
          Turn your screen sideways
        </div>
        <p className="loading-screen__status">Return to landscape to continue with Riri.</p>
      </div>
    </div>
  )
}

export function ControlsMenu({
  cameraMode,
  closeLabel = 'Close',
  isPhone,
  touchControls = isPhone,
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
  const moveHint = isPhone
    ? 'Hold and drag the joystick'
    : touchControls
      ? 'Joystick, WASD or arrow keys'
      : 'WASD or arrow keys'
  const runHint = isPhone
    ? 'Push the joystick to its outer edge'
    : touchControls
      ? 'Joystick outer edge, or hold Shift while moving'
      : 'Hold Shift while moving'
  const lookHint = isPhone
    ? 'Drag the right side'
    : touchControls
      ? 'Mouse drag, or drag the right side on touch'
      : 'Drag the classroom'

  return (
    <section className="controls-menu" aria-label="Controls">
      <div className="controls-menu__heading">
        <strong>Controls</strong>
        <button className="text-button" onClick={onClose}>
          {closeLabel}
        </button>
      </div>

      <dl className="controls-menu__guide">
        <div>
          <dt>Move</dt>
          <dd>{moveHint}</dd>
        </div>
        <div>
          <dt>Run</dt>
          <dd>{runHint}</dd>
        </div>
        {!freeCamera && (
          <div>
            <dt>Camera</dt>
            <dd>Recenters behind Riri after movement</dd>
          </div>
        )}
        {freeCamera && (
          <div>
            <dt>Look</dt>
            <dd>{lookHint}</dd>
          </div>
        )}
        {freeCamera && !isPhone && (
          <div>
            <dt>Zoom</dt>
            <dd>Use the mouse wheel</dd>
          </div>
        )}
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
            : 'The view stays stable while you move, then recenters behind Riri.'}
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
          ? 'Recommendations use the built-in 108-song catalog. Voice stays in the browser.'
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
        <button className="text-button" onClick={onClose}>
          Close
        </button>
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
