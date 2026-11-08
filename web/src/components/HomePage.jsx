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
      <img className="home__art" src="/classroom-poster.jpg" alt="" fetchPriority="high" />
      <header className="home__header">
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
            <button
              className="button button--primary home__enter"
              onClick={onEnter}
              autoFocus={returning}
            >
              Enter the room
            </button>
          </div>
        </section>
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
        <p>
          Resonance Room is a small experiment in music discovery with Riri, a 3D avatar that
          recommends music.
        </p>
        <p>
          {config.usesBackend
            ? 'This version connects to the local recommendation server. Tell Riri what you like, explore six recommendations, and like your favorites.'
            : 'This public demo uses a built-in catalog of 36 songs. Choose a vibe, explore six recommendations, and like your favorites.'}
        </p>
        <p>
          In local mode, Riri can use Claude to interpret your request and Last.fm to find
          recommendations when the services are configured.
        </p>
        <p className="home__fine-print">
          Likes stay in this browser session. Music is not streamed here.
          {!config.usesBackend && ' The public demo does not connect to Claude or Last.fm.'}
        </p>
      </dialog>
    </main>
  )
}
