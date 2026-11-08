import { useEffect, useRef, useState } from 'react'

export default function RoomLoading({
  failed = false,
  rotate = false,
  fading = false,
  ready = false,
  onContinue,
  onBack,
}) {
  const [slow, setSlow] = useState(false)
  const screen = useRef(null)
  useEffect(() => {
    screen.current?.focus()
    const timer = setTimeout(() => setSlow(true), 45000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <section
      ref={screen}
      tabIndex={-1}
      className="room-loading"
      data-fading={fading}
      aria-labelledby="room-loading-title"
      onKeyDown={(event) => event.stopPropagation()}
      onKeyUp={(event) => event.stopPropagation()}
    >
      <div className="room-loading__art" aria-hidden="true">
        <img src="/preparation-window.jpg" alt="" decoding="async" fetchPriority="low" />
      </div>
      <div className="room-loading__content">
        {!failed && !rotate && !ready && (
          <span className="loading-screen__ring" aria-hidden="true" />
        )}
        <h1 id="room-loading-title">
          {failed
            ? 'The room couldn’t load'
            : rotate
              ? 'Turn your screen sideways'
              : 'Before You Enter'}
        </h1>
        <p role={failed ? 'alert' : 'status'}>
          {failed
            ? 'Check your connection, then reload the page to try again.'
            : rotate
              ? 'The room needs more width. Rotate your screen to continue, or return to the homepage.'
              : ready
                ? 'The room is ready'
                : slow
                  ? 'This is taking a while. You can return home and try again.'
                  : 'Preparing the room… Loading Riri and the classroom.'}
        </p>
        {!failed && (
          <section className="room-loading__guide" aria-label="Room controls">
            {rotate && <h2>Before You Enter</h2>}
            <ul>
              <li>Move Riri with WASD or the arrow keys. Hold Shift to run.</li>
              <li>On touch screens, use the joystick; push to its outer edge to run.</li>
              <li>
                Small touch screens need landscape. Larger tablets can use either orientation.
              </li>
              <li>
                Free camera is on: drag to look around, or drag the right side on touch. Choose
                Follow in Controls for automatic camera turning. Voice is off until you enable it in
                Controls.
              </li>
            </ul>
          </section>
        )}
        <div className="room-loading__actions">
          {!failed && (
            <button
              className="button button--primary"
              onClick={onContinue}
              disabled={!ready || rotate || fading || !onContinue}
            >
              Continue
            </button>
          )}
          {failed && (
            <button className="button button--primary" onClick={() => window.location.reload()}>
              Reload page
            </button>
          )}
          <button className="home__about" onClick={onBack}>
            Back to home
          </button>
        </div>
      </div>
    </section>
  )
}
