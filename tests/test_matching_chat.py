import asyncio

import pytest

from backend import main as api
from test_lastfm_responses import install_assistant, install_lastfm, request


@pytest.mark.parametrize("message", ["Focus", "study", "workout", "relax", "focused", "relaxed"])
def test_bare_activity_replies_fetch_music_without_forcing_longer_nonmusic_questions(
    monkeypatch, message
):
    calls = install_assistant(monkeypatch, {"mood": "chill"})
    install_lastfm(monkeypatch, {"chill": {"tracks": {"track": []}}})
    assert request(message).status_code == 200
    assert calls[0]["tool_choice"] == {"type": "any"}


def test_discovery_deadline_returns_safe_error_without_followup(monkeypatch):
    calls = install_assistant(monkeypatch)

    async def timeout(*_, **_kwargs):
        raise TimeoutError("private details")

    monkeypatch.setattr(api, "discover", timeout)
    response = request()
    assert response.status_code == 502
    assert response.json()["detail"] == "Music data provider unavailable"
    assert len(calls) == 1


@pytest.mark.parametrize(
    "mood,query,related",
    [
        ("chill", "chill", "relaxed"),
        ("focused", "study", "chill"),
        ("energetic", "energetic", "upbeat"),
        ("happy", "happy", "uplifting"),
        ("sad", "sad", "nostalgic"),
        ("relaxed", "relaxed", "peaceful"),
    ],
)
def test_original_mood_families_filter_genre_results_using_related_tags(
    monkeypatch, mood, query, related
):
    calls = install_assistant(monkeypatch, {"genre": "jazz", "mood": mood})
    tracks = [{"name": name, "artist": {"name": "Artist"}} for name in ("Unknown", "Match")]
    outgoing = install_lastfm(
        monkeypatch,
        {
            "jazz": {"tracks": {"track": tracks}},
            query: {"tracks": {"track": []}},
        },
        {"Match": ["jazz", related]},
    )
    response = request()
    assert response.status_code == 200
    assert outgoing == ["jazz", query]
    assert [song["title"] for song in response.json()["recommendations"]] == ["Match"]
    assert len(calls) == 2


@pytest.mark.parametrize("payload", [None, {}, {"error": 29}, {"toptags": {"tag": "bad"}}])
def test_unavailable_metadata_is_unknown_not_a_provider_claim(monkeypatch, payload):
    from httpx import AsyncClient, MockTransport, Response

    monkeypatch.setattr(
        api.httpx,
        "AsyncClient",
        lambda **kwargs: AsyncClient(
            transport=MockTransport(lambda request: Response(200, json=payload)), **kwargs
        ),
    )
    assert asyncio.run(api.fetch_track_tags({"title": "Song", "artist": "Artist"})) == []


def test_metadata_ignores_weak_and_malformed_tags(monkeypatch):
    from httpx import AsyncClient, MockTransport, Response

    def handle(outgoing):
        assert outgoing.url.params["method"] == "track.gettoptags"
        assert outgoing.url.params["track"] == "Song"
        assert outgoing.url.scheme == "https"
        return Response(
            200,
            json={
                "toptags": {
                    "tag": [
                        {"name": "jazz", "count": "100"},
                        {"name": "chill", "count": "30"},
                        {"name": "energetic", "count": "1"},
                        {"name": "bad", "count": "NaN"},
                        {"name": {}, "count": "80"},
                        None,
                    ]
                }
            },
        )

    monkeypatch.setattr(
        api.httpx,
        "AsyncClient",
        lambda **kwargs: AsyncClient(transport=MockTransport(handle), **kwargs),
    )
    assert asyncio.run(api.fetch_track_tags({"title": "Song", "artist": "Artist"})) == [
        "jazz",
        "chill",
    ]
