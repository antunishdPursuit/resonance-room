# Resonance Room

Resonance Room is an interactive 3D music-discovery experience. Visitors talk with a virtual music guide, receive recommendations, explore a classroom environment, and save songs that fit their taste.

The project combines a React and Three.js frontend, a FastAPI orchestration layer, external music and language providers, speech synthesis, and a deterministic local recommender that keeps the core experience available without provider credentials.

## Current Features

- Natural-language music requests based on genre, artist, mood, or activity
- Real song discovery through Last.fm when provider credentials are configured
- Transparent local recommendations when external providers are unavailable
- A movable VRM avatar with walking, running, idle, greeting, facial, and lip-sync behavior
- Collision-aware movement through a mapped 3D classroom
- Orbit, zoom, follow, and reset camera controls
- A response bubble anchored to the avatar with an accessible live-region mirror
- A collapsible conversation transcript and a 20-message context limit
- A selectable six-song classroom board synchronized with the transcript
- Song cards, safe external links, and a five-song liked list
- Camera occlusion fading when classroom furniture blocks Esme
- ElevenLabs speech with browser-speech fallback
- Automated backend, frontend, dependency, and build checks

## Project Lineage

Resonance Room grew from the music recommender in [applied-ai-system-project](https://github.com/antunishdPursuit/applied-ai-system-project). The original repository preserves the AI 110 project and its reliability pass. This repository is the standalone product line for continued interaction, movement, accessibility, and recommendation work.

The deterministic scoring engine remains part of the application because it provides an auditable fallback and exposes the tradeoffs behind content-based recommendation.

## Architecture

```text
Visitor
  -> React + Three.js classroom
  -> FastAPI /chat
      -> Anthropic + Last.fm when configured
      -> local scoring recommender when credentials are unavailable
  -> response text + song cards
  -> ElevenLabs or browser speech
  -> VRM animation, facial movement, and lip sync
```

Read the detailed [architecture](docs/architecture.md), [fallback recommender explanation](docs/fallback-recommender.md), [fallback model card](docs/fallback-model-card.md), [evaluation](docs/fallback-evaluation.md), and [testing record](docs/testing.md).

## Technology

### Frontend

- React 19
- Three.js
- `@pixiv/three-vrm`
- `@pixiv/three-vrm-animation`
- Vite

### Backend and recommendation

- Python
- FastAPI
- Anthropic SDK
- HTTPX
- Last.fm API
- ElevenLabs API
- Deterministic content-based scoring fallback

## Local Setup

### Prerequisites

- Python 3.11 or a compatible modern Python 3 release
- Node.js compatible with Vite 8

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
ANTHROPIC_API_KEY=your_key_here
LASTFM_API_KEY=your_key_here
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=
```

Do not commit this file. Anthropic and Last.fm are optional because the local recommender supplies the fallback path. ElevenLabs is also optional because the browser can provide speech.

### 3. Start the backend

From the repository root:

```powershell
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --reload --port 8001
```

### 4. Install and start the frontend

From `web`:

```powershell
npm ci
npm run dev -- --host 127.0.0.1 --port 5173
```

Open `http://127.0.0.1:5173`.

Stop both development servers after testing and verify that ports `8001` and `5173` are closed.

## Controls

- Move: `WASD` or arrow keys
- Run: hold `Shift` while moving
- Rotate the regular camera: drag with the primary pointer button
- Zoom: mouse wheel
- Restore the starting view: **Reset camera**

Movement does not activate while a form control is focused.

## Development Views

The following query parameters are available only in the development build:

- `?inspectClassroom=1` shows classroom mesh and collision inspection.
- `?debugCollisions=1` shows movement collision zones.
- `?testAnimations=1` shows the animation preview controls.

## Deployment

The repository includes a `render.yaml` Blueprint for:

- a free Python web service named `resonance-room-api`;
- a free static site named `resonance-room-web`;
- a `/health` check for the FastAPI service;
- automatic deployment only after GitHub checks pass.

During the initial Render Blueprint setup, provide:

```env
FRONTEND_ORIGINS=https://resonance-room-web.onrender.com
VITE_API_BASE_URL=https://resonance-room-api.onrender.com
```

Use the exact URLs Render assigns if either service name changes. After changing
`VITE_API_BASE_URL`, redeploy the static site because Vite embeds that value at
build time.

The recommended first public deployment is fallback-only. Leave
`ANTHROPIC_API_KEY`, `LASTFM_API_KEY`, and `ELEVENLABS_API_KEY` unset. The local
recommender and browser speech remain available without paid provider
credentials.

Render free web services spin down after periods without traffic, so the first
fallback request after inactivity can take longer while the API wakes up. The
backend stores no user data and requires no persistent disk or database.

## Verification

From the repository root:

```powershell
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe -m pip_audit -r requirements.lock
```

From `web`:

```powershell
npm test
npm run build
npm audit
```

Provider-dependent Anthropic, Last.fm, and ElevenLabs behavior requires valid local credentials and must be verified separately from the fallback path.

If Last.fm is enabled for a public release, review its current API terms,
attribution requirements, rate limits, and permitted use before adding the key.

## Recommendation Boundaries

- The bundled fallback catalog contains only 18 synthetic records.
- Exact genre and mood labels can outweigh otherwise similar audio characteristics.
- Anthropic intent extraction can infer an unexpected tag from vague language.
- Last.fm results depend on community-generated tags and provider availability.
- The five-song preference trigger and 20-message context window are deliberate product limits.

See the [fallback model card](docs/fallback-model-card.md) for evaluation evidence and bias details.

## Third-Party Assets

- Avatar locomotion uses the [Universal Animation Library](https://quaternius.com/packs/universalanimationlibrary.html) by Quaternius. `UAL1_Standard.glb` is distributed under CC0 1.0, and the repository includes the license text.
- The classroom source is recorded in this [Fab listing](https://www.fab.com/listings/a92bc730-55a9-46e5-ae25-4dcd9e6a08f8).
- `Esme.vrm` is the VRoid Project's [AvatarSample_B](https://hub.vroid.com/en/characters/7939147878897061040/models/2292219474373673889). Its VRoid Hub conditions allow avatar use, commercial use, redistribution, and alterations without attribution. The model is not CC0.
- The bundled VRMA files still require a final provenance and redistribution review before a production release.

## Status

Resonance Room is feature-complete for its current release scope and is in
release hardening. The remaining production gates are final VRMA provenance
review, deployment, and a smoke test of the public fallback experience.
