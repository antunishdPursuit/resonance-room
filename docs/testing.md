# Testing and Reliability

Resonance Room uses automated tests, locked dependencies, security audits, and manual browser checks. These checks cover the static and backend mode boundary, both deterministic recommenders, API boundaries, avatar behavior, classroom movement, and the production frontend build.

## Automated tests

### Python

Run from the repository root:

```powershell
.\.venv\Scripts\python.exe -m pytest -q
```

The Python suite covers:

- recommendation ordering and explanations;
- fallback chat behavior when provider keys are unavailable;
- request validation and input limits;
- safe provider error responses;
- asynchronous Anthropic client handling;
- Last.fm application identification and link allowlisting;
- local and configured production frontend origins;
- the provider-independent deployment health endpoint.

### Frontend

Run from `web`:

```powershell
npm.cmd test
```

The frontend suite covers:

- static mode making no chat or speech requests to FastAPI;
- backend chat payload validation and backend speech fallback;
- deterministic six-song recommendations from all 18 stored frontend records;
- movement, running, speech, contextual actions, and idle-state priority;
- recovery across repeated Three.js animation crossfades;
- the rear classroom collision boundary;
- classroom occlusion fading and restoration;
- opening composition and greeting synchronization;
- six-song board layout, proximity, raycasting, and drag rejection;
- shared board, transcript, and liked-song selection state;
- production animation assignments, finite sequences, and development-preview filtering;
- restrained speaking facial motion;
- speech-bubble positioning, edge clamping, and visibility.

The current release baseline is 72 passing frontend tests and 15 passing Python tests.

## Production build

Run from `web`:

```powershell
npm.cmd run build
```

This confirms that Vite can produce the deployable frontend bundle.

## Dependency audits

Run the JavaScript audit from `web`:

```powershell
npm.cmd audit --audit-level=low
```

Run the Python audit from the repository root after installing `pip-audit` in the active environment:

```powershell
.\.venv\Scripts\python.exe -m pip_audit -r requirements.lock
```

The GitHub Actions quality workflow repeats the Python tests, Python dependency
audit, frontend tests, JavaScript audit, and frontend build for pull requests
and pushes to `main`.

## Manual browser checks

Automated checks do not prove that the 3D scene looks and feels correct.

### Static release mode

1. Keep port `8001` closed and load the frontend with no local mode override.
2. Confirm the classroom, avatar, and retained animation assets load.
3. Confirm walking and running return to idle without a visible jump.
4. Confirm the avatar does not pass through the tested classroom boundaries.
5. Send a request and confirm six deterministic recommendations return without a FastAPI request.
6. Confirm browser speech, facial motion, and the world-anchored speech bubble remain synchronized.
7. Confirm the transcript, keyboard controls, camera controls, and reduced-motion behavior remain usable.
8. Confirm blackboard selection stays synchronized with transcript heart controls.
9. Confirm camera dragging does not select a song and distant interaction shows the proximity cue.
10. Confirm browser developer tools show no unexpected runtime errors.

After deployment, repeat the static fallback chat journey against the public
frontend with no backend configured. Confirm that the six-song board, transcript,
liked-song state, browser speech, movement, camera, and assets still work. A local
build does not verify Render's build environment, CDN delivery, or public asset
paths.

### Optional backend mode

1. Confirm `GET /health` returns a successful response.
2. Confirm `GET /tts/available` reflects the local ElevenLabs configuration.
3. Send a chat request through the frontend in backend mode.
4. Confirm six recommendations return.
5. With provider keys absent, confirm FastAPI uses its Python fallback.
6. If ElevenLabs is configured, confirm `POST /tts` returns `audio/mpeg`.
7. If ElevenLabs fails, confirm enabled speech falls back to the browser.
8. Stop FastAPI and restore static mode after the check.

If FastAPI itself is unreachable, backend chat reports an error. It does not
silently switch to the frontend recommender.

## Recommendation evaluation

The deterministic fallback recommender also has a six-profile evaluation record in [Fallback Evaluation](fallback-evaluation.md). It is useful evidence about ranking behavior, but it does not replace the automated suite or browser verification.
