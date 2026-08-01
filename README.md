# Resonance Room

Resonance Room is an interactive 3D music-discovery experience. Visitors talk with a virtual music guide, receive recommendations, explore a classroom, and save songs that fit their taste.

The public release is a frontend-only React and Three.js site. It uses a bundled 18-song catalog and deterministic scoring in the browser, so its core experience does not depend on a server, provider key, or paid API. An optional FastAPI mode remains available for local development with Anthropic, Last.fm, and ElevenLabs.

## Current Features

- Natural-language music requests based on genre, artist, mood, or activity
- Six deterministic recommendations from a stored catalog in the public static build
- Optional real-song discovery through Last.fm in local backend mode
- A movable VRM avatar with walking, running, idle, greeting, facial, and lip-sync behavior
- Collision-aware movement through a mapped 3D classroom
- Orbit, zoom, follow, and reset camera controls
- Camera occlusion fading when classroom furniture blocks Esme
- A response bubble anchored to the avatar with an accessible live-region mirror
- A collapsible conversation transcript and a 20-message context limit
- A selectable six-song classroom board synchronized with transcript heart controls
- A liked-song panel with safe external links when a provider supplies them
- Browser speech in the public build and optional ElevenLabs speech in backend mode
- Automated backend, frontend, dependency, and production-build checks

## Project Lineage

Resonance Room grew from the music recommender in [applied-ai-system-project](https://github.com/antunishdPursuit/applied-ai-system-project). The original repository preserves the AI 110 project and its reliability pass. This repository is the standalone product line for continued interaction, movement, accessibility, and recommendation work.

The deterministic scoring engine remains part of the application because it provides an auditable fallback and exposes the tradeoffs behind content-based recommendation.

## Architecture

The application has two explicit modes:

```text
Public static mode
Visitor
  -> React + Three.js classroom
  -> browser keyword matching + deterministic scoring
  -> bundled 18-song catalog
  -> response, six-song board, transcript, and liked-song panel
  -> browser speech

Optional local backend mode
Visitor
  -> React + Three.js classroom
  -> FastAPI /chat
      -> Anthropic + Last.fm when configured
      -> Python deterministic fallback when provider credentials are unavailable
  -> optional FastAPI /tts -> ElevenLabs
  -> browser speech if ElevenLabs is unavailable
```

The public static mode does not send chat or speech requests to FastAPI. Read the detailed [architecture](docs/architecture.md), [fallback recommender explanation](docs/fallback-recommender.md), [fallback model card](docs/fallback-model-card.md), [evaluation](docs/fallback-evaluation.md), and [testing record](docs/testing.md).

## Technology

### Frontend

- React 19
- Three.js
- `@pixiv/three-vrm`
- `@pixiv/three-vrm-animation`
- Vite

### Optional local backend

- Python
- FastAPI
- Anthropic SDK
- HTTPX
- Last.fm API
- ElevenLabs API
- Deterministic content-based scoring fallback

## Frontend-Only Quick Start

### Prerequisites

- Node.js 24, matching the continuous-integration build

From `web`:

```powershell
npm.cmd ci
npm.cmd run dev -- --host 127.0.0.1 --port 5173
```

Open `http://127.0.0.1:5173/`.

No backend or environment file is required. Static mode is the default.
Voice starts off, and the accessible transcript starts open.

## Optional Local Backend Mode

Use this mode to test FastAPI, provider-backed recommendations, or ElevenLabs. Python 3.11 is the continuous-integration version.

### 1. Create the Python environment

From the repository root:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --require-hashes -r requirements.lock
```

For macOS or Linux, activate the environment with:

```bash
source .venv/bin/activate
```

### 2. Configure optional providers

Create `backend/.env`:

```env
ANTHROPIC_API_KEY=
LASTFM_API_KEY=
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=
```

Do not commit this file. Without Anthropic or Last.fm credentials, FastAPI uses the Python fallback. Without ElevenLabs credentials, the frontend can use browser speech.

### 3. Start FastAPI

From `backend`:

```powershell
python -m uvicorn main:app --host 127.0.0.1 --port 8001
```

The health endpoint is `http://127.0.0.1:8001/health`.

### 4. Select backend mode in the frontend

Create `web/.env.local`:

```env
VITE_APP_MODE=backend
VITE_API_BASE_URL=http://127.0.0.1:8001
```

Then start or restart Vite from `web`:

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5173
```

Delete `web/.env.local`, or set `VITE_APP_MODE=static`, before testing the frontend-only release again. Stop both development servers after testing and verify that ports `5173` and `8001` are closed.

## Controls

- Move: `WASD` or arrow keys
- Run: hold `Shift` while moving
- Rotate the camera: drag with the primary pointer button
- Zoom: mouse wheel
- Restore the starting view: **Reset camera**

Movement does not activate while a form control is focused.

## Development Views

These query parameters work only in the Vite development build:

- `?inspectClassroom=1` shows classroom mesh and collision inspection.
- `?debugCollisions=1` shows movement collision zones.
- `?testAnimations=1` shows animation preview controls.

They are excluded from the production JavaScript behavior.

## Deployment

The root `render.yaml` defines one Render static site named `resonance-room-web`. Render builds `web` with `npm ci && npm run build`, publishes `web/dist`, and sets `VITE_APP_MODE=static`. No backend service, secret, database, or persistent disk is required for this release.

Automatic deployment waits for GitHub checks to pass. The optional FastAPI source remains in the repository for local development and a possible future backend release.

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

Provider-dependent Anthropic, Last.fm, and ElevenLabs behavior requires valid local credentials and must be verified separately from the public static path.

## Recommendation Boundaries

- The bundled catalog contains only 18 synthetic records.
- Static intent matching recognizes a small set of genre, mood, and activity keywords.
- Static recommendations use the latest submitted message; backend mode receives a bounded conversation history.
- Exact genre and mood labels can outweigh otherwise similar audio characteristics.
- The liked-song list has no fixed maximum.
- Five liked songs trigger a taste-profile request only in optional backend mode.
- The conversation context is limited to 20 messages.
- Last.fm results depend on community-generated tags and provider availability.

See the [fallback model card](docs/fallback-model-card.md) for evaluation evidence and bias details.

## Third-Party Assets

- Movement, opening, idle, and contextual avatar motion use the [Universal Animation Library](https://quaternius.com/packs/universalanimationlibrary.html) by Quaternius. `UAL1_Standard.glb` is distributed under CC0 1.0, and the repository includes its license text.
- The classroom source is recorded in this [Fab listing](https://www.fab.com/listings/a92bc730-55a9-46e5-ae25-4dcd9e6a08f8).
- `Esme.vrm` is the VRoid Project's [AvatarSample_B](https://hub.vroid.com/en/characters/7939147878897061040/models/2292219474373673889). Its VRoid Hub conditions allow avatar use, commercial use, redistribution, and alterations without attribution. The model is not CC0.
- No standalone VRMA motion files are included in the release.

## Status

Resonance Room is feature-complete for its current frontend-only scope. The remaining release gates are repository-history sanitation, GitHub replacement verification, Render deployment, and a public smoke test.
