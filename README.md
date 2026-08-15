# Resonance Room

[Try Resonance Room live](https://resonance-room-web.onrender.com/)

[Watch the Resonance Room demo on YouTube](https://youtu.be/O3GUOC3G2SA)

Resonance Room is an interactive 3D music-discovery experience. Explore a virtual classroom, choose a vibe, receive six song recommendations, and keep a liked list for the current session.

The public demo runs entirely in the browser with a transparent, deterministic 36-song catalog. It does not require an account, backend, provider key, or paid API.

> **Character name:** Riri is the current product character name. The bundled source model remains AvatarSample_B.

## Why It Exists

Music recommenders often hide their logic behind a search box or an opaque feed. Resonance Room makes a small recommendation system visible inside a spatial experience: the visitor chooses a current mood or activity, sees a bounded set of results, and can inspect the system's limitations.

## What You Can Do

- Enter through a shared loading and Ready experience that explains the controls
- Choose Chill, Focus, Energy, Feel-good, Moody, or Surprise me
- Receive six deterministic recommendations from a 36-song stored catalog
- Get a fresh set when a vibe repeats and unused matches remain
- Like songs and receive a session-only taste summary after five compatible likes
- Walk or run through a collision-aware classroom
- Orbit, zoom, follow, and reset the camera
- Review a timed response bubble and retained session transcript
- Enable optional browser speech from Controls
- Use landscape touch movement and camera controls on a phone

The surrounding hallway, courtyard wing, and school exterior provide visual context. They are not a fully explorable campus.

## How It Works

```text
Visitor
  -> React + Three.js classroom
  -> one of six guided vibe profiles
  -> deterministic scoring over a bundled 36-song catalog
  -> six songs, response, transcript, and liked-song panel
  -> optional browser speech
```

The public static mode does not send chat or speech requests to FastAPI. The repository retains an optional local backend mode for Anthropic-assisted intent extraction, Last.fm discovery, a separate 18-song Python fallback, and ElevenLabs speech.

Read [How the Music Recommender Works](docs/music-recommender.md) for the scoring logic, catalog boundary, and known biases.

## Controls

### Desktop

- Move: `WASD` or arrow keys
- Run: hold `Shift` while moving
- Look around: drag with the primary pointer button
- Zoom: mouse wheel
- Restore the starting view: **Reset camera** in Controls

### Phone

- Rotate the phone to landscape before entering
- Move: drag the left joystick
- Run: push the joystick into its outer ring
- Look around: drag the right side of the classroom
- Release the joystick to stop

Movement does not activate while a form control is focused. Browser device emulation helps with responsive review but does not replace real-phone testing.

## Technology

### Public frontend

- React 19
- Three.js
- `@pixiv/three-vrm`
- `@pixiv/three-vrm-animation`
- Vite

### Optional local backend

- Python and FastAPI
- Anthropic SDK
- Last.fm API
- ElevenLabs API
- Deterministic Python fallback recommender

## Run Locally

### Frontend-only mode

Node.js 24 matches the continuous-integration environment.

From `web`:

```powershell
npm.cmd ci
npm.cmd run dev -- --host 127.0.0.1 --port 5173
```

Open `http://127.0.0.1:5173/`. Static mode is the default and requires no environment file.

### Optional backend mode

Python 3.11 matches the continuous-integration environment.

From the repository root:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --require-hashes -r requirements.lock
```

Create `backend/.env`:

```env
ANTHROPIC_API_KEY=
LASTFM_API_KEY=
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=
```

Start FastAPI from `backend`:

```powershell
python -m uvicorn main:app --host 127.0.0.1 --port 8001
```

Create `web/.env.local`:

```env
VITE_APP_MODE=backend
VITE_API_BASE_URL=http://127.0.0.1:8001
```

Then start or restart Vite. Remove `web/.env.local`, or set `VITE_APP_MODE=static`, before testing the public release path again. Stop both servers after testing and verify that ports `5173` and `8001` are closed.

## Verification

From the repository root:

```powershell
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe -m pip_audit -r requirements.lock
```

From `web`:

```powershell
npm.cmd test
npm.cmd run build
npm.cmd audit --audit-level=low
```

Automated checks do not prove visual quality, recommendation usefulness, real-phone behavior, provider availability, or a successful public deployment. Verify those paths separately when they are in scope.

## Privacy and Data

- The public static mode does not require an account.
- Likes, recent recommendations, transcript messages, and the taste summary remain in the current browser session and are not persisted by the app.
- Browser speech stays on the visitor's browser-supported speech path.
- Optional backend providers receive only the data sent while backend mode is explicitly configured.

## Current Limits

- The static catalog contains 36 synthetic records and six preset vibes.
- Exact genre and mood labels can outweigh otherwise similar audio attributes.
- The catalog represents a narrow range of music and cultural contexts.
- Static likes change response wording after five compatible selections but do not retrain the ranking formula.
- The conversation context is limited to 20 messages.
- The campus backdrop is not an open-world environment.
- Real-phone touch review remains a separate release gate from browser emulation.
- Provider-backed behavior requires local credentials and separate verification.

## Project Lineage

Resonance Room grew from the music recommender in [applied-ai-system-project](https://github.com/antunishdPursuit/applied-ai-system-project). The original repository preserves the AI 110 course project. This repository is the active standalone product line for continued interaction, accessibility, environment, and recommendation work.

## Assets and Acknowledgments

- Character movement uses the [Universal Animation Library](https://quaternius.com/packs/universalanimationlibrary.html) by Quaternius under CC0 1.0. The repository includes its license text.
- The classroom source is recorded in this [Fab listing](https://www.fab.com/listings/a92bc730-55a9-46e5-ae25-4dcd9e6a08f8).
- The bundled `Riri.vrm` file is the VRoid Project's [AvatarSample_B](https://hub.vroid.com/en/characters/7939147878897061040/models/2292219474373673889). The product name does not replace the source model's identity or license terms.

## Status

The frontend-only demo is live. The road treatment and Riri character rename are implemented. Real-phone verification remains pending. The optional FastAPI mode remains local-development functionality.
