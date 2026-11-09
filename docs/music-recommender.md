# How the Music Recommender Works

The public static demo uses deterministic content-based scoring over 36 synthetic songs. The optional local AI backend uses Claude and Last.fm to discover real tracks. These are separate recommendation paths.

## Two Recommendation Paths

| Path | Source | Selection |
| --- | --- | --- |
| Public static frontend | 36 synthetic records in `web/src/recommendations/songCatalog.js` | Fixed weighted scoring, repeat avoidance, and artist variety |
| Optional local AI backend | Real tracks from Last.fm, requested through Claude tool calls | Genre-tag lookup; mood-tag lookup only when genre results are empty; up to six unique results |

The local AI backend requires both `ANTHROPIC_API_KEY` and `LASTFM_API_KEY`. Missing or blank keys produce HTTP 503 with a setup message. It does not silently substitute synthetic songs. Static mode does not call the backend or require provider keys.

The scoring below describes only the public static catalog. Live Last.fm results do not carry equivalent numeric audio attributes and do not use this formula.

## Song Attributes

Each song stores categorical labels such as genre and mood plus numeric attributes such as energy, acousticness, valence, tempo, and danceability.

## Scoring

The static browser scorer uses a maximum score of 9 points:

| Feature | Maximum | Rule |
| --- | ---: | --- |
| Genre | 2.0 | Exact categorical match |
| Energy | 2.0 | Numeric closeness to target |
| Acousticness | 1.5 | Numeric closeness to target |
| Mood | 1.0 | Exact categorical match |
| Valence | 1.0 | Numeric closeness to target |
| Tempo | 1.0 | Normalized numeric closeness |
| Danceability | 0.5 | Numeric closeness and light tiebreaking |

Genre and energy receive the largest weights because style and intensity strongly shape the perceived vibe. Mood receives less weight because mood labels are more subjective. Danceability receives the least weight because it overlaps with energy.

The browser implementation maps each of the six guided vibes to its own target labels and numeric values, using the fixed weights above. The source in `web/src/recommendations/fallbackRecommender.js` is the authority for exact current frontend values.

## Selection Flow

1. Map the selected static vibe to a target profile.
2. Score every song against that profile.
3. Sort the songs from highest to lowest score.
4. Prefer distinct artists when enough artists are available.
5. Avoid songs already shown in the current session when at least six unused suitable records remain.
6. Return six songs.

After five compatible likes, static mode summarizes the liked songs' common genre and mood plus average energy, danceability, and acousticness. The summary changes the character's response wording. It does not currently alter the ranking formula or persist after reload.

## Strengths

- Reproducible and testable results
- No account, secret, or external provider required
- Transparent attributes and weights
- Fast browser execution
- A provider-independent public demonstration path

## Limitations and Biases

- Genre and mood use exact matches, so related labels receive no partial credit.
- Strong genre weighting can suppress a close song from another genre.
- One target per numeric attribute cannot represent varied listening contexts.
- Synthetic metadata does not come from measured audio analysis.
- The static catalog covers a narrow range of genres and cultural contexts.
- Session-only likes do not create durable personalization.
- A small catalog amplifies every scoring and labeling choice.

## Evidence Boundary

Automated tests verify determinism, result count, repeat avoidance, artist diversity, and code boundaries. They do not prove that recommendations feel useful to listeners. Recommendation quality requires scenario-based review and user feedback.

## When to Reconsider the Model

Consider a broader catalog or another approach only when the product requires open-ended artists or genres, persistent profiles, context-specific taste, measured audio attributes, feedback learning, or live track availability.

Any replacement must preserve explainability, privacy, cost boundaries, and a provider-independent failure path.
