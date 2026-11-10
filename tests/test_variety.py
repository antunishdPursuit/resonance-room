import asyncio
from collections import Counter
from types import SimpleNamespace

import pytest

from backend.discovery import discover
from backend.main import _format_tracks
from backend.recommendation_tools import recommendation_results
from backend.track_selection import artist_key, track_key
from test_api import request
from test_recommendation_tools import install_provider, tool


def song(index, artist=None):
    return {"title": f"Track {index}", "artist": artist or f"Artist {index}", "url": ""}


@pytest.mark.parametrize("title,artist", [("x" * 513, "A"), ("T", "a" * 513)])
def test_provider_records_exceeding_identity_bounds_are_never_displayed(title, artist):
    assert _format_tracks([{"name": title, "artist": {"name": artist}}]) == []
    assert _format_tracks([{"name": "🎵" * 512, "artist": {"name": "A"}}])


def test_deeper_pool_filters_seen_before_metadata_and_balances_artist_dominance():
    excluded = [song(i, "Dominant") for i in range(30)]
    candidates = excluded + [song(i, "Dominant") for i in range(30, 65)]
    candidates += [song(i) for i in range(65, 100)]
    enriched, fetched = [], []

    async def fetch(tag, limit):
        fetched.append((tag, limit))
        return candidates

    async def tags(track):
        enriched.append(track)
        return ["jazz", "chill"]

    calls = [SimpleNamespace(id="a", input={"genre": "jazz", "mood": "chill"})]
    keys = {track_key(s) for s in excluded}
    groups = asyncio.run(discover(calls, fetch, tags, lambda rows: rows, excluded_keys=keys))
    selected, _ = recommendation_results(calls, groups, excluded_keys=keys)
    assert fetched == [("jazz", 100), ("chill", 100)]
    assert len(enriched) == 24
    assert not keys.intersection(track_key(s) for s in enriched + selected)
    assert len(selected) == len({artist_key(s) for s in selected}) == 6
    assert any(int(s["title"].split()[-1]) >= 65 for s in selected)


def test_selection_excludes_case_and_whitespace_variants_across_tools_and_caps_artists():
    calls = [SimpleNamespace(id="a"), SimpleNamespace(id="b")]
    old = {"title": "  TRACK 0  ", "artist": " ARTIST   0 "}
    groups = [[song(0), song(1, "Same"), song(2, "Same"), song(3)], [song(4), song(0)]]
    selected, results = recommendation_results(calls, groups, excluded_keys={track_key(old)})
    assert {track_key(s) for s in selected} == {
        track_key(s) for s in [song(1, "Same"), song(3), song(4)]
    }
    assert all("Track 0" not in r["content"] and "Track 2" not in r["content"] for r in results)
    assert [r["tool_use_id"] for r in results] == ["a", "b"]


def test_less_seen_artists_are_preferred_without_banning_previous_artists():
    calls = [SimpleNamespace(id="a")]
    tracks = [song(i, "Familiar") for i in range(3)] + [song(3), song(4)]
    selected, _ = recommendation_results(calls, [tracks], artist_counts=Counter({"familiar": 5}))
    assert [s["artist"] for s in selected] == ["Artist 3", "Artist 4", "Familiar"]


@pytest.mark.parametrize("excluded_count,matching_index", [(0, 1), (10, 21)])
def test_mood_lookup_preserves_genre_source_when_mood_chart_has_many_artists(
    excluded_count, matching_index
):
    genre = [song(i, "Shared genre artist") for i in range(30)]
    mood = [song(i) for i in range(100, 200)]
    enriched = []

    async def fetch(tag, limit):
        return genre if tag == "jazz" else mood

    async def tags(track):
        enriched.append(track)
        return ["chill"] if track == genre[matching_index] else ["energetic", "rock"]

    calls = [SimpleNamespace(id="a", input={"genre": "jazz", "mood": "chill"})]
    groups = asyncio.run(
        discover(
            calls,
            fetch,
            tags,
            lambda rows: rows,
            excluded_keys={track_key(track) for track in genre[:excluded_count]},
        )
    )
    selected, _ = recommendation_results(calls, groups)
    assert len(enriched) == 24
    assert genre[matching_index] in enriched
    assert selected == [genre[matching_index]]


def test_mood_lookup_covers_later_genre_artists_without_one_artist_using_the_budget():
    later = [song(i) for i in range(30, 36)]
    genre = [song(i, "Dominant") for i in range(30)] + later
    mood = [song(i) for i in range(100, 200)]
    enriched = []

    async def fetch(tag, limit):
        return genre if tag == "jazz" else mood

    async def tags(track):
        enriched.append(track)
        return ["chill"] if track in later else ["energetic", "rock"]

    calls = [SimpleNamespace(id="a", input={"genre": "jazz", "mood": "chill"})]
    groups = asyncio.run(discover(calls, fetch, tags, lambda rows: rows))
    selected, _ = recommendation_results(calls, groups)
    assert len(enriched) == 24
    assert all(track in enriched for track in later)
    assert selected == later


def test_seen_and_liked_api_contract_excludes_tracks_from_cards_and_tool_results(monkeypatch):
    tracks = [{"name": f"Track {i}", "artist": {"name": f"Artist {i}"}} for i in range(20)]
    calls, _ = install_provider(monkeypatch, [tool("a", "jazz")], {"jazz": tracks})
    response = request(
        "POST",
        "/chat",
        json={
            "messages": [{"role": "user", "content": "More jazz music"}],
            "seen_songs": [song(0)],
            "liked_songs": [song(1)],
        },
    )
    assert response.status_code == 200
    assert [s["title"] for s in response.json()["recommendations"]] == [
        f"Track {i}" for i in range(2, 8)
    ]
    content = calls[1]["messages"][-1]["content"][0]["content"]
    assert "Track 0 by" not in content and "Track 1 by" not in content


def test_exhausted_pool_returns_no_unseen_message_without_paid_followup(monkeypatch):
    tracks = [{"name": "Track 0", "artist": {"name": "Artist 0"}}]
    calls, _ = install_provider(monkeypatch, [tool("a", "jazz")], {"jazz": tracks})
    response = request(
        "POST",
        "/chat",
        json={
            "messages": [{"role": "user", "content": "More jazz music"}],
            "liked_songs": [song(0)],
        },
    )
    assert response.status_code == 200 and response.json()["recommendations"] == []
    assert "No unseen matching tracks" in response.json()["response"]
    assert "new chat" not in response.json()["response"]
    assert len(calls) == 1


@pytest.mark.parametrize("field", ["seen_songs", "liked_songs"])
@pytest.mark.parametrize(
    "value",
    [
        [song(i) for i in range(121)],
        [{"title": " ", "artist": "A"}],
        [{"title": "x" * 513, "artist": "A"}],
    ],
)
def test_session_context_is_bounded_before_provider_calls(field, value):
    assert (
        request(
            "POST", "/chat", json={"messages": [{"role": "user", "content": "music"}], field: value}
        ).status_code
        == 422
    )
