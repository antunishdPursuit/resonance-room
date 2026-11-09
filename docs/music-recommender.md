# How the Music Recommender Works

The public static demo uses deterministic content-based scoring over 108 synthetic songs. The optional local AI backend uses Claude and Last.fm to discover real tracks. These are separate recommendation paths.

## Two Recommendation Paths

| Path | Source | Selection |
| --- | --- | --- |
| Public static frontend | 108 synthetic records in `web/src/recommendations/songCatalog.js` | Fixed weighted scoring, repeat avoidance, and artist variety |
| Optional local AI backend | Real tracks from Last.fm, requested through Claude tool calls | Combined genre/mood tag discovery, evidence-based filtering and ranking; up to six unique results |

The local AI backend requires both `ANTHROPIC_API_KEY` and `LASTFM_API_KEY`. Missing or blank keys produce HTTP 503 with a setup message. It does not silently substitute synthetic songs. Static mode does not call the backend or require provider keys.

The scoring below describes only the public static catalog. Live Last.fm results do not carry equivalent numeric audio attributes and do not use this formula.

### Local Last.fm matching

Claude supplies a genre only when requested. Mood/activity alone is valid; omitting both uses Last.fm's top-track chart for broad discovery. Genre and mood are queried together even when the genre lookup succeeds. Focus/study share an activity tag, and related mood tags receive partial credit instead of requiring identical spelling.

Candidates carry their query-tag provenance and, for mood requests, track top tags. An explicit genre requires supporting evidence; a requested mood requires exact/related evidence. Ranking uses genre support (2 points) plus mood similarity (up to 1 point), with retrieval order breaking ties. These points are not the static audio-feature formula or enjoyment probabilities. Optional malformed/unavailable track tags remain unknown. Tags below 10% of a track's highest tag count are ignored. Community tags are imperfect proxies, not measured audio energy, tempo or valence; sad does not imply low energy.

Each chat accepts at most four recommendation tool calls, two queries per call and 12 candidates per query. Queries are deduplicated within the request; a fair, unique 24-track pool is enriched with at most four concurrent metadata requests. Discovery has a 20-second deadline and returns at most six unique tracks. There is no persistent cache. Insufficient evidence can return fewer tracks or a clear no-match response without synthetic substitutes; provider failures use the existing safe error response. No additional Claude pass or voice call is added.

The 108-record static catalog includes calm/focused, high-energy, uplifting, darker-mood, and moderate discovery examples across multiple genres. Songs can suit more than one vibe. Catalog coverage does not change the fixed scoring rules or establish real-world listening quality.

The ten guided choices include Wind down, Dance, Acoustic, and Romantic. These four profiles apply eligibility rules before ranking, with no implicit genre preference:

| Profile | Eligible tracks |
| --- | --- |
| Wind down | Energy at most 0.35, tempo at most 80 BPM, acousticness at least 0.80, and peaceful/chill/relaxed mood |
| Dance | Danceability at least 0.80, energy at least 0.70, and tempo from 110 to 145 BPM |
| Acoustic | Acousticness at least 0.80 and energy at most 0.60; this does not imply instrumental-only music |
| Romantic | Explicit romantic mood label |

Eligible tracks use the same scoring formula and weights below, with profile-specific numeric targets. A profile with no preferred genre earns no genre bonus; Acoustic also has no preferred mood. The original six profiles retain their numeric targets but no longer assume a preferred genre. Related moods receive partial credit where the profile has a mood target and its eligibility rules admit those labels; Acoustic has no mood bonus and Romantic still requires romantic tracks. Once an eligible pool is exhausted, repeat avoidance permits matching tracks to repeat rather than introducing unrelated candidates.

## Song Attributes

Each song stores categorical labels such as genre and mood plus numeric attributes such as energy, acousticness, valence, tempo, and danceability.

## Scoring

The static browser scorer uses a maximum score of 7 points after removing the assumed genre bonus. Numeric attribute weights remain unchanged:

| Feature | Maximum | Rule |
| --- | ---: | --- |
| Genre | 0.0 | Guided vibes supply no genre preference, so no genre bonus is awarded |
| Energy | 2.0 | Numeric closeness to target |
| Acousticness | 1.5 | Numeric closeness to target |
| Mood | 1.0 | Full credit for an exact/compatible label, partial credit for related moods |
| Valence | 1.0 | Numeric closeness to target |
| Tempo | 1.0 | Normalized numeric closeness |
| Danceability | 0.5 | Numeric closeness and light tiebreaking |

Energy receives the largest weight because intensity strongly shapes the perceived vibe. Mood receives less weight because mood labels are more subjective. Danceability receives the least weight because it overlaps with energy.

Guided vibe names do not imply a genre: Energy does not mean pop, Focus does not mean lofi, and Surprise me does not mean jazz. The public static UI offers preset vibes; free-form genre and mood requests belong to the optional local AI path. Scores are relative ranking values, not enjoyment probabilities.

Related-mood examples: Focus receives 0.8 mood points for chill, 0.7 for relaxed and 0.6 for peaceful. Intense and energetic receive full mutual credit. Moody receives 0.9 for melancholic and 0.7 for nostalgic. Unrelated or unknown labels receive no mood credit. Numeric energy and valence stay separate, so dark mood does not itself imply low intensity.

The browser implementation maps each of the ten guided vibes to its own target labels and numeric values, using the fixed weights above. The source in `web/src/recommendations/fallbackRecommender.js` is the authority for exact current frontend values.

## Selection Flow

1. Map the selected static vibe to a target profile.
2. For the four new profiles, filter the catalog to eligible songs; the original six use the full catalog.
3. Score eligible songs against the profile and sort from highest to lowest score.
4. Prefer unused eligible songs; allow previous recommendations back when fewer than six unused candidates remain.
5. Prefer distinct artists when enough eligible artists are available.
6. Return up to six songs; all ten profiles have enough eligible tracks to fill a six-song batch in the bundled catalog.

After five compatible likes, static mode summarizes the liked songs' common genre and mood plus average energy, danceability, and acousticness. The summary changes the character's response wording. It does not currently alter the ranking formula or persist after reload.

## Strengths

- Reproducible and testable results
- No account, secret, or external provider required
- Transparent attributes and weights
- Fast browser execution
- A provider-independent public demonstration path

## Limitations and Biases

- Static mode offers fixed guided vibes rather than free-form genre preferences. Mood relationships are authored heuristics, not learned probabilities.
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
