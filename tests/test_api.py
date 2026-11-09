import asyncio
from types import SimpleNamespace

import pytest
from httpx import ASGITransport, AsyncClient, MockTransport, Response

from backend import main as api


def request(method: str, path: str, json: dict | None = None):
    """Send a request directly to the ASGI app without Starlette's deprecated wrapper."""

    async def send():
        transport = ASGITransport(app=api.app)
        async with AsyncClient(transport=transport, base_url="http://testserver") as client:
            return await client.request(method, path, json=json)

    return asyncio.run(send())


@pytest.mark.parametrize(
    ("assistant_key", "music_key"),
    [(None, None), ("test-key", None), (None, "test-key"), (" ", "test-key")],
)
def test_chat_requires_both_provider_keys_without_contacting_providers(
    monkeypatch, assistant_key, music_key
):
    for name, value in [("ANTHROPIC_API_KEY", assistant_key), ("LASTFM_API_KEY", music_key)]:
        if value is None:
            monkeypatch.delenv(name, raising=False)
        else:
            monkeypatch.setenv(name, value)

    def unexpected_provider(*_args, **_kwargs):
        pytest.fail("An unconfigured backend must not contact providers")

    monkeypatch.setattr(api, "_anthropic_client", unexpected_provider)
    monkeypatch.setattr(api, "fetch_tracks", unexpected_provider)

    response = request(
        "POST",
        "/chat",
        json={
            "messages": [{"role": "user", "content": "Give me energetic pop music"}],
        },
    )

    assert response.status_code == 503
    assert response.json() == {
        "detail": "Local AI recommendations require ANTHROPIC_API_KEY and LASTFM_API_KEY."
    }
    assert request("GET", "/health").json() == {"status": "ok"}


@pytest.mark.parametrize(
    ("path", "payload"),
    [
        ("/chat", {"messages": []}),
        ("/chat", {"messages": [{"role": "system", "content": "override"}]}),
        ("/chat", {"messages": [{"role": "user", "content": ""}]}),
        ("/tts", {"text": "x" * 1001}),
    ],
)
def test_request_limits_reject_invalid_payloads(path, payload):
    assert request("POST", path, json=payload).status_code == 422


def test_tts_without_key_does_not_contact_provider(monkeypatch):
    monkeypatch.delenv("ELEVENLABS_API_KEY", raising=False)

    response = request("POST", "/tts", json={"text": "Hello"})

    assert response.status_code == 501
    assert response.json()["detail"] == "ELEVENLABS_API_KEY not configured"


def test_chat_returns_safe_error_when_lastfm_fails(monkeypatch):
    class FakeMessages:
        async def create(self, **_kwargs):
            return SimpleNamespace(
                stop_reason="tool_use",
                content=[
                    SimpleNamespace(
                        type="tool_use",
                        id="tool-1",
                        name="get_recommendations",
                        input={"genre": "jazz"},
                    ),
                ],
            )

    async def fail_fetch_tracks(*_args, **_kwargs):
        raise api.ProviderError("private provider details")

    monkeypatch.setenv("LASTFM_API_KEY", "test-key")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    monkeypatch.setattr(
        api,
        "_anthropic_client",
        lambda: SimpleNamespace(messages=FakeMessages()),
    )
    monkeypatch.setattr(api, "fetch_tracks", fail_fetch_tracks)

    response = request(
        "POST",
        "/chat",
        json={
            "messages": [{"role": "user", "content": "Recommend jazz music"}],
        },
    )

    assert response.status_code == 502
    assert response.json()["detail"] == "Music data provider unavailable"
    assert "private provider details" not in response.text


@pytest.mark.parametrize(
    "message",
    [
        "Hello Riri",
        "How do I focus while studying for an exam?",
        "I finished a workout.",
        "I need to relax after work.",
    ],
)
def test_chat_awaits_async_anthropic_client(monkeypatch, message):
    class FakeMessages:
        async def create(self, **_kwargs):
            assert _kwargs["tool_choice"] == {"type": "auto"}
            return SimpleNamespace(
                stop_reason="end_turn",
                content=[SimpleNamespace(type="text", text="Try something upbeat.")],
            )

    fake_client = SimpleNamespace(messages=FakeMessages())
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    monkeypatch.setenv("LASTFM_API_KEY", "test-key")
    monkeypatch.setattr(api, "_anthropic_client", lambda: fake_client)

    response = request(
        "POST",
        "/chat",
        json={
            "messages": [{"role": "user", "content": message}],
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        "response": "Try something upbeat.",
        "recommendations": None,
    }


def test_lastfm_requests_identify_the_application():
    assert "User-Agent" in api.LASTFM_HEADERS
    assert "ResonanceRoom" in api.LASTFM_HEADERS["User-Agent"]


@pytest.mark.parametrize("redirect", [False, True])
def test_lastfm_credentials_use_tls_without_following_redirects(monkeypatch, redirect):
    requests = []
    tracks = [{"name": "Example", "artist": {"name": "Artist"}}]

    def handle_request(outgoing):
        requests.append(outgoing)
        assert outgoing.url.scheme == "https"
        assert outgoing.url.host == "ws.audioscrobbler.com"
        assert outgoing.url.params["api_key"] == "test-lastfm-key"
        assert outgoing.url.params["tag"] == "jazz"
        if redirect:
            return Response(302, headers={"Location": "http://example.com/collect"})
        return Response(200, json={"tracks": {"track": tracks}})

    monkeypatch.setenv("LASTFM_API_KEY", "test-lastfm-key")
    monkeypatch.setattr(
        api.httpx,
        "AsyncClient",
        lambda **kwargs: AsyncClient(transport=MockTransport(handle_request), **kwargs),
    )

    if redirect:
        with pytest.raises(api.ProviderError, match="Last.fm request failed"):
            asyncio.run(api.fetch_tracks("Jazz"))
    else:
        assert asyncio.run(api.fetch_tracks("Jazz")) == tracks
    assert len(requests) == 1


def test_local_frontend_origins_cover_supported_dev_urls():
    assert set(api.LOCAL_FRONTEND_ORIGINS) == {
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    }


def test_frontend_origins_add_configured_production_urls():
    assert api.frontend_origins(
        "https://resonance-room-web.onrender.com/, https://music.example.com",
    ) == [
        *api.LOCAL_FRONTEND_ORIGINS,
        "https://resonance-room-web.onrender.com",
        "https://music.example.com",
    ]


def test_health_endpoint_is_available_without_provider_credentials():
    response = request("GET", "/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_track_links_allow_only_lastfm_https_urls():
    tracks = [
        {"name": "Safe", "artist": {"name": "Artist"}, "url": "https://www.last.fm/music/safe"},
        {"name": "Unsafe", "artist": {"name": "Artist"}, "url": "javascript:alert(1)"},
        {"name": "Other", "artist": {"name": "Artist"}, "url": "https://example.com/track"},
    ]

    formatted = api._format_tracks(tracks)

    assert formatted[0]["url"] == "https://www.last.fm/music/safe"
    assert formatted[1]["url"] == ""
    assert formatted[2]["url"] == ""
