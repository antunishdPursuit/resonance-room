import asyncio
from types import SimpleNamespace

import pytest
from httpx import ASGITransport, AsyncClient, MockTransport, Response

from backend import main as api


def install_lastfm(monkeypatch, payloads, metadata=None):
    requests = []

    def handle(outgoing):
        if outgoing.url.params["method"] == "track.gettoptags":
            tags = (metadata or {}).get(outgoing.url.params["track"], [])
            return Response(
                200, json={"toptags": {"tag": [{"name": tag, "count": "100"} for tag in tags]}}
            )
        tag = outgoing.url.params.get("tag")
        requests.append(tag)
        return Response(200, json=payloads[tag if tag is not None else "__chart__"])

    monkeypatch.setenv("LASTFM_API_KEY", "test-key")
    monkeypatch.setattr(
        api.httpx,
        "AsyncClient",
        lambda **kwargs: AsyncClient(transport=MockTransport(handle), **kwargs),
    )
    return requests


def install_assistant(monkeypatch, criteria=None):
    calls = []

    class Messages:
        async def create(self, **kwargs):
            calls.append(kwargs)
            if len(calls) == 1:
                return SimpleNamespace(
                    stop_reason="tool_use",
                    content=[
                        SimpleNamespace(
                            type="tool_use",
                            name="get_recommendations",
                            id="a",
                            input=criteria
                            if criteria is not None
                            else {"genre": "jazz", "mood": "chill"},
                        )
                    ],
                )
            return SimpleNamespace(
                stop_reason="end_turn",
                content=[SimpleNamespace(type="text", text="Try the matching track.")],
            )

    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    monkeypatch.setenv("LASTFM_API_KEY", "test-key")
    monkeypatch.setattr(api, "_anthropic_client", lambda: SimpleNamespace(messages=Messages()))
    return calls


def request(message="Recommend jazz music"):
    async def send():
        async with AsyncClient(
            transport=ASGITransport(app=api.app), base_url="http://testserver"
        ) as client:
            return await client.post(
                "/chat", json={"messages": [{"role": "user", "content": message}]}
            )

    return asyncio.run(send())


@pytest.mark.parametrize("code", [6, 10, 29])
def test_http_success_with_lastfm_application_error_is_not_an_empty_success(monkeypatch, code):
    install_lastfm(monkeypatch, {"jazz": {"error": code, "message": "private provider details"}})
    with pytest.raises(api.ProviderError):
        asyncio.run(api.fetch_tracks("jazz"))


@pytest.mark.parametrize(
    "payload", [None, [], {}, {"tracks": None}, {"tracks": {}}, {"tracks": {"track": "invalid"}}]
)
def test_malformed_lastfm_envelopes_raise_provider_error(monkeypatch, payload):
    install_lastfm(monkeypatch, {"jazz": payload})
    with pytest.raises(api.ProviderError):
        asyncio.run(api.fetch_tracks("jazz"))


def test_application_error_becomes_safe_502_without_mood_retry_or_claude_followup(monkeypatch):
    calls = install_assistant(monkeypatch)
    outgoing = install_lastfm(
        monkeypatch, {"jazz": {"error": 10, "message": "private provider details"}}
    )
    response = request()
    assert response.status_code == 502
    assert response.json()["detail"] == "Music data provider unavailable"
    assert "private provider details" not in response.text
    assert outgoing == ["jazz"]
    assert len(calls) == 1


@pytest.mark.parametrize("found", [False, True])
def test_legitimate_empty_genre_tries_mood_and_handles_no_matches_explicitly(monkeypatch, found):
    calls = install_assistant(monkeypatch)
    track = {"name": "Matching track", "artist": {"name": "Artist"}}
    outgoing = install_lastfm(
        monkeypatch,
        {
            "jazz": {"tracks": {"track": []}},
            "chill": {"tracks": {"track": [track] if found else []}},
        },
        {"Matching track": ["jazz", "chill"]},
    )
    response = request()
    assert response.status_code == 200
    assert outgoing == ["jazz", "chill"]
    if found:
        assert response.json()["recommendations"][0]["title"] == "Matching track"
        assert len(calls) == 2
    else:
        assert response.json()["recommendations"] == []
        assert "no matching tracks" in response.json()["response"].lower()
        assert len(calls) == 1


@pytest.mark.parametrize("url", [None, 7, {}, [], "https://[invalid"])
def test_malformed_optional_urls_cannot_crash_track_formatting(url):
    track = {"name": "Song", "artist": {"name": "Artist"}, "url": url}
    assert api._format_tracks([track]) == [{"title": "Song", "artist": "Artist", "url": ""}]


def test_malformed_required_metadata_is_skipped_instead_of_reaching_the_frontend():
    records = [
        None,
        "bad",
        {"name": 4, "artist": {"name": "Artist"}},
        {"name": "Song", "artist": {"name": {}}},
        {"name": " ", "artist": {"name": "Artist"}},
    ]
    assert api._format_tracks(records) == []
