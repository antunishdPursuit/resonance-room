import { useEffect, useState } from 'react'

export default function RoomLoading({ failed = false, rotate = false, fading = false, onBack }) {
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 45000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <section className="room-loading" data-fading={fading} aria-labelledby="room-loading-title">
      <div className="room-loading__content">
        {!failed && !rotate && <span className="loading-screen__ring" aria-hidden="true" />}
        <h1 id="room-loading-title">
          {failed
            ? 'The room couldn’t load'
            : rotate
              ? 'Turn your screen sideways'
              : 'Preparing the room…'}
        </h1>
        <p role={failed ? 'alert' : 'status'}>
          {failed
            ? 'Check your connection, then reload the page to try again.'
            : rotate
              ? 'The room needs landscape on touch screens. You can return to the homepage in either orientation.'
              : slow
                ? 'This is taking a while. You can return home and try again.'
                : 'Loading Riri and the classroom.'}
        </p>
        <div className="room-loading__actions">
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
