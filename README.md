# Resonance Room

Resonance Room is an interactive 3D music-discovery experience. Visitors talk with a virtual music guide, receive recommendations, explore a classroom environment, and save songs that fit their taste.

The project combines a React and Three.js frontend, a FastAPI orchestration layer, external music and language providers, speech synthesis, and a deterministic local recommender that keeps the core experience available without provider credentials.

## Current Features

- Natural-language music requests based on genre, artist, mood, or activity
- Real song discovery through Last.fm when provider credentials are configured
- Transparent local recommendations when external providers are unavailable
- A movable VRM avatar with walking, running, idle, greeting, facial, and lip-sync behavior
- Collision-aware movement through a mapped 3D classroom
- Orbit, zoom, follow, inspection, and reset camera controls
- A response bubble anchored to the avatar with an accessible live-region mirror
- A collapsible conversation transcript and a 20-message context limit
- Song cards, safe external links, and a five-song liked list
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
npm install
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
- `Esme.vrm`, `Velvetta.vrm`, and the bundled VRMA files require a final provenance and redistribution review before a production release.

## Status

Resonance Room is an active prototype. Movement, animation, fallback recommendations, the response bubble, and the primary conversation flow are implemented. Transcript layout, classroom song placement, loading presentation, provider credential testing, and avatar portability remain active or deferred work.
