# Testing and Reliability

Resonance Room uses automated tests, locked dependencies, security audits, and manual browser checks. These checks cover the local recommender, API boundaries, avatar behavior, classroom movement, and production frontend build.

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
- supported local frontend origins.

### Frontend

Run from `web`:

```powershell
npm.cmd test
```

The frontend suite covers:

- movement, running, speech, contextual actions, and idle-state priority;
- recovery across repeated Three.js animation crossfades;
- the rear classroom collision boundary;
- restrained speaking facial motion;
- speech-bubble positioning, edge clamping, and visibility.

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

The GitHub Actions quality workflow repeats the Python tests, Python dependency audit, JavaScript audit, and frontend build for pull requests and pushes to `main`.

## Manual browser checks

Automated checks do not prove that the 3D scene looks and feels correct. Before a release, verify:

1. The classroom, avatar, and retained animation assets load.
2. Walking and running transition back to idle without a visible jump.
3. The avatar does not pass through the tested desks, boards, curtains, bookshelf, windows, or rear wall.
4. Chat still returns the deterministic fallback when provider keys are unavailable.
5. Speech, facial motion, and the world-anchored speech bubble remain synchronized.
6. The transcript, keyboard controls, camera controls, and reduced-motion behavior remain usable.
7. Browser developer tools show no unexpected runtime errors.

## Recommendation evaluation

The deterministic fallback recommender also has a six-profile evaluation record in [Fallback Evaluation](fallback-evaluation.md). It is useful evidence about ranking behavior, but it does not replace the automated suite or browser verification.
