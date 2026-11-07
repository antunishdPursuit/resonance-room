import { useEffect, useRef, useState } from 'react'
import { createAppConfig } from '../config/appConfig.js'
import '../homepage.css'

const config = createAppConfig({
  mode: import.meta.env.VITE_APP_MODE,
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
})

export default function HomePage({ onEnter, returning = false }) {
  const [aboutOpen, setAboutOpen] = useState(false)
  const about = useRef(null)

  useEffect(() => {
    if (aboutOpen) about.current.showModal()
    else about.current.close()
  }, [aboutOpen])

  return (
    <main className="home">
      <header className="home__header">
        <span className="home__brand">Resonance Room</span>
        <button className="home__about" onClick={() => setAboutOpen(true)}>
          About
        </button>
      </header>
      <div className="home__layout">
        <section className="home__copy" aria-labelledby="home-title">
          <div>
            <h1 id="home-title">
              Resonance
              <br />
              Room
            </h1>
            <p className="home__intro">A small experiment in music discovery.</p>
            <button
              className="button button--primary home__enter"
              onClick={onEnter}
              autoFocus={returning}
            >
              Enter the room
            </button>
            <p className="home__promise">
              {config.usesBackend
                ? 'Meet Riri. Tell her what you like. Find six songs.'
                : 'Meet Riri. Choose a vibe. Find six songs.'}
            </p>
            <details className="home__controls">
              <summary>Before you enter</summary>
              <p>
                Use WASD or the arrow keys to move Riri. Hold Shift to run. On touch screens, use
                the movement joystick in landscape.
              </p>
              <p>The camera follows Riri automatically. Voice is off until you enable it.</p>
            </details>
          </div>
          <p className="home__catalog">
            {config.usesBackend ? 'Connected recommendations' : 'Built-in 36-song catalog'}
          </p>
        </section>
        <div
          className="home__doorway"
          role="img"
          aria-label="An open doorway into Riri’s classroom"
        >
          <div className="home__room" />
          <div className="home__door" />
        </div>
      </div>
      <dialog
        ref={about}
        className="home__dialog"
        aria-labelledby="about-title"
        onClose={() => setAboutOpen(false)}
      >
        <form method="dialog">
          <button className="home__about" autoFocus>
            Close
          </button>
        </form>
        <h2 id="about-title">Meet Riri</h2>
        <p>Riri is a 3D avatar that recommends music.</p>
        <p>
          This public demo uses a built-in catalog of 36 songs. Choose a vibe, explore six
          recommendations, and like your favorites.
        </p>
        <p>
          In local mode, Riri can use Claude to interpret your request and Last.fm to find
          recommendations when the services are configured.
        </p>
        <p className="home__fine-print">
          Likes stay in this browser session. The public demo does not stream music or connect to
          Claude or Last.fm.
        </p>
      </dialog>
    </main>
  )
}
