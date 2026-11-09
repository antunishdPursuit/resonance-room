"""Bounded Last.fm discovery using tag evidence, never invented audio features."""

import asyncio

ALIASES = {
    "lo fi": "lofi",
    "hip hop": "hiphop",
    "r&b": "rnb",
    "focus": "focused",
    "study": "focused",
    "studying": "focused",
    "workout": "energetic",
    "intense": "energetic",
    "energy": "energetic",
    "feel good": "happy",
    "uplifting": "happy",
    "moody": "sad",
    "melancholic": "sad",
    "wind down": "relaxed",
    "calm": "relaxed",
    "relax": "relaxed",
    "relaxing": "relaxed",
    "mellow": "relaxed",
    "chillout": "chill",
    "chill out": "chill",
}
RELATED = {
    "focused": {"chill": 0.8, "relaxed": 0.7, "peaceful": 0.6},
    "chill": {"relaxed": 0.9, "peaceful": 0.8, "focused": 0.7},
    "energetic": {"upbeat": 0.8, "high energy": 1, "dance": 0.6},
    "happy": {"confident": 0.6, "romantic": 0.4},
    "sad": {"nostalgic": 0.7, "angry": 0.4},
    "relaxed": {"chill": 0.9, "peaceful": 0.8, "focused": 0.6},
    "peaceful": {"chill": 0.8, "relaxed": 0.8, "focused": 0.5},
}
QUERY_TAGS = {"focused": "study", "energetic": "energetic", "sad": "sad"}


def normalize(tag):
    tag = " ".join(tag.casefold().replace("-", " ").split())
    return ALIASES.get(tag, tag)


def track_key(track):
    return (track["title"].casefold(), track["artist"].casefold())


def is_bare_music_request(message):
    label = normalize(message.strip(" .!?"))
    return label in {"surprise me", *RELATED} or any(label in tags for tags in RELATED.values())


def query_tags(criteria):
    tags = []
    for field in ("genre", "mood"):
        if criteria.get(field):
            raw = criteria[field].strip().casefold()
            tag = QUERY_TAGS.get(normalize(raw), raw) if field == "mood" else raw
            if tag not in tags:
                tags.append(tag)
    return tags or [None]  # No criteria means charts, never an invented genre.


def rank_tracks(criteria, candidates, evidence):
    genre = normalize(criteria["genre"]) if criteria.get("genre") else None
    mood = normalize(criteria["mood"]) if criteria.get("mood") else None
    ranked = []
    for index, track in enumerate(candidates):
        tags = {normalize(tag) for tag in evidence.get(track_key(track), [])}
        if genre and genre not in tags:
            continue
        mood_score = 0
        if mood:
            mood_score = max(
                (1 if tag == mood else RELATED.get(mood, {}).get(tag, 0) for tag in tags),
                default=0,
            )
            if not mood_score:
                continue
        ranked.append((2 * bool(genre) + mood_score, index, track))
    ranked.sort(key=lambda item: (-item[0], item[1]))
    return [track for _, _, track in ranked]


async def discover(calls, fetch_tracks, fetch_tags, format_tracks):
    """At most 8 queries, 24 candidates/tag lookups and 4 concurrent lookups.

    Per-request deduplication only: no persistent cache or fabricated metadata.
    Unknown mood/genre evidence yields fewer results, not relaxed constraints.
    """
    if not 1 <= len(calls) <= 4:
        raise ValueError("Expected one to four recommendation calls")
    async with asyncio.timeout(20):
        queries, groups, evidence = {}, [], {}
        for call in calls:
            sources = []
            for tag in query_tags(call.input):
                if tag not in queries:
                    queries[tag] = format_tracks(await fetch_tracks(tag, limit=12))[:12]
                for track in queries[tag]:
                    evidence.setdefault(track_key(track), set())
                    if tag is not None:
                        evidence[track_key(track)].add(tag)
                sources.append(queries[tag])
            group = []
            for row in range(max(map(len, sources), default=0)):
                for source in sources:
                    if row < len(source) and source[row] not in group:
                        group.append(source[row])
            groups.append(group)
        # Round-robin across tools so one request cannot consume the entire pool.
        pool = {}
        for row in range(max(map(len, groups), default=0)):
            for group in groups:
                if row < len(group) and len(pool) < 24:
                    pool.setdefault(track_key(group[row]), group[row])
        if any(call.input.get("mood") for call in calls):
            semaphore = asyncio.Semaphore(4)

            async def enrich(key, track):
                async with semaphore:
                    tags = await fetch_tags(track)
                evidence[key].update(tags or [])

            await asyncio.gather(*(enrich(key, track) for key, track in pool.items()))
        return [
            rank_tracks(call.input, [t for t in group if track_key(t) in pool], evidence)
            for call, group in zip(calls, groups)
        ]
