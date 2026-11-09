import asyncio
from types import SimpleNamespace

from backend.discovery import discover, query_tags, rank_tracks, track_key


def track(title):
    return {"title": title, "artist": "Artist", "url": ""}


def test_mood_only_queries_do_not_invent_a_genre():
    assert query_tags({"mood": "focused"}) == ["study"]
    assert query_tags({"genre": "jazz", "mood": "focused"}) == ["jazz", "study"]
    assert query_tags({}) == [None]
    assert query_tags({"mood": "chillout"}) == ["chillout"]


def test_exact_related_unknown_and_conflicting_moods_rank_by_evidence():
    songs = [track(name) for name in ("unknown", "wrong", "related", "exact")]
    evidence = {
        track_key(songs[1]): ["jazz", "energetic"],
        track_key(songs[2]): ["jazz", "chill"],
        track_key(songs[3]): ["jazz", "study"],
    }
    assert rank_tracks({"genre": "jazz", "mood": "focus"}, songs, evidence) == songs[:1:-1]
    # Sad is a mood, not a claim that a track is low energy.
    assert rank_tracks({"mood": "sad"}, songs[:1], {track_key(songs[0]): ["sad", "energetic"]})
    assert rank_tracks({"mood": "chill"}, songs[:1], {track_key(songs[0]): ["chillout"]})
    assert (
        rank_tracks({"mood": "energetic"}, songs[:1], {track_key(songs[0]): ["happy", "chill"]})
        == []
    )


def test_explicit_genre_is_required_but_unspecified_genre_is_neutral():
    song = track("Candidate")
    evidence = {track_key(song): ["chill", "rock"]}
    assert rank_tracks({"genre": "jazz", "mood": "chill"}, [song], evidence) == []
    assert rank_tracks({"mood": "chill"}, [song], evidence) == [song]
    assert rank_tracks({"genre": "hip-hop"}, [song], {track_key(song): ["hip hop"]}) == [song]


def test_discovery_checks_mood_even_when_genre_has_results_and_deduplicates():
    song, other = track("Popular but wrong mood"), track("Compatible")
    fetched = []

    async def fetch(tag, limit):
        fetched.append((tag, limit))
        return [song, other] if tag == "jazz" else [other]

    async def tags(item):
        return ["energetic"] if item == song else ["jazz", "chill"]

    calls = [SimpleNamespace(input={"genre": "jazz", "mood": "focused"})]
    result = asyncio.run(discover(calls, fetch, tags, lambda tracks: tracks))
    assert fetched == [("jazz", 12), ("study", 12)]
    assert result == [[other]]


def test_discovery_bounds_candidates_concurrency_queries_and_reuses_query_results():
    fetched, enriched, active, peak = [], [], 0, 0

    async def fetch(tag, limit):
        fetched.append(tag)
        return [track(f"{tag}-{i}") for i in range(30)]

    async def tags(song):
        nonlocal active, peak
        active += 1
        peak = max(peak, active)
        await asyncio.sleep(0)
        enriched.append(song)
        active -= 1
        return ["chill", "genre0", "genre1", "genre2", "genre3"]

    calls = [SimpleNamespace(input={"genre": f"genre{i}", "mood": "chill"}) for i in range(4)]
    groups = asyncio.run(discover(calls, fetch, tags, lambda tracks: tracks))
    assert len(fetched) == 5
    assert len(enriched) == 24
    assert peak <= 4
    assert all(group for group in groups)
    assert all(
        any(song["title"].startswith(f"genre{i}") for song in group)
        for i, group in enumerate(groups)
    )
