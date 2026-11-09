import asyncio
from types import SimpleNamespace

import pytest
from httpx import ASGITransport, AsyncClient

from backend import main as api


def tool(call_id, genre, **extra):
    return SimpleNamespace(
        type="tool_use", name="get_recommendations", id=call_id, input={"genre": genre, **extra}
    )


def install_provider(monkeypatch, blocks, tracks, final=None):
    calls, fetches = [], []

    class Messages:
        async def create(self, **kwargs):
            calls.append(kwargs)
            if len(calls) == 1:
                return SimpleNamespace(stop_reason="tool_use", content=blocks)
            return final or SimpleNamespace(
                stop_reason="end_turn",
                content=[SimpleNamespace(type="text", text="Try these songs.")],
            )

    async def fetch(tag, limit=6):
        fetches.append(tag)
        return tracks.get(tag, [])

    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    monkeypatch.setenv("LASTFM_API_KEY", "test-key")
    monkeypatch.setattr(api, "_anthropic_client", lambda: SimpleNamespace(messages=Messages()))
    monkeypatch.setattr(api, "fetch_tracks", fetch)
    return calls, fetches


def request():
    async def send():
        async with AsyncClient(
            transport=ASGITransport(app=api.app), base_url="http://testserver"
        ) as client:
            return await client.post(
                "/chat", json={"messages": [{"role": "user", "content": "Recommend jazz and rock"}]}
            )

    return asyncio.run(send())


def tracks(prefix):
    return [{"name": f"{prefix} {i}", "artist": {"name": f"Artist {prefix} {i}"}} for i in range(6)]


def test_every_parallel_tool_receives_a_result_and_frontend_keeps_six_tracks(monkeypatch):
    blocks = [
        SimpleNamespace(type="text", text="Finding music."),
        tool("jazz-call", "jazz"),
        tool("rock-call", "rock"),
    ]
    calls, fetches = install_provider(
        monkeypatch, blocks, {"jazz": tracks("Jazz"), "rock": tracks("Rock")}
    )
    response = request()
    assert response.status_code == 200
    assert fetches == ["jazz", "rock"]
    songs = response.json()["recommendations"]
    assert [song["title"] for song in songs] == [
        "Jazz 0",
        "Rock 0",
        "Jazz 1",
        "Rock 1",
        "Jazz 2",
        "Rock 2",
    ]
    followup = calls[1]
    assert followup["tool_choice"] == {"type": "none"}
    assert followup["messages"][-2]["content"] == blocks
    results = followup["messages"][-1]["content"]
    assert [result["tool_use_id"] for result in results] == ["jazz-call", "rock-call"]
    for result, prefix in zip(results, ["Jazz", "Rock"]):
        assert result["type"] == "tool_result"
        assert len(result["content"].splitlines()) == 3
        assert all(prefix in line for line in result["content"].splitlines())


def test_duplicate_tracks_are_not_duplicated_or_described_as_missing(monkeypatch):
    shared = tracks("Shared")
    calls, _ = install_provider(
        monkeypatch, [tool("a", "jazz"), tool("b", "rock")], {"jazz": shared, "rock": shared}
    )
    response = request()
    songs = response.json()["recommendations"]
    assert len(songs) == len({(song["title"], song["artist"]) for song in songs}) == 6
    assert len(calls[1]["messages"][-1]["content"]) == 2
    assert calls[1]["messages"][-1]["content"][1]["content"] == (
        "No additional tracks selected for this request."
    )


@pytest.mark.parametrize(
    "blocks",
    [
        [],
        [tool("a", [])],
        [tool("a", "jazz", mood={})],
        [tool("a", "jazz", mood=" ")],
        [tool("a", "jazz", unknown="value")],
        [tool("a", "j" * 65)],
        [tool(str(i), "jazz") for i in range(5)],
        [tool("a", "jazz"), tool("a", "rock")],
        [tool("", "jazz")],
        [SimpleNamespace(type="tool_use", name="unknown", id="a", input={"genre": "jazz"})],
    ],
)
def test_invalid_tool_batches_fail_safely_before_provider_work(monkeypatch, blocks):
    calls, fetches = install_provider(monkeypatch, blocks, {})
    response = request()
    assert response.status_code == 502
    assert response.json()["detail"] == "Music assistant provider unavailable"
    assert len(calls) == 1
    assert fetches == []


@pytest.mark.parametrize(
    "reason,text", [("tool_use", ""), ("end_turn", " "), ("max_tokens", "Partial reply")]
)
def test_incomplete_followup_does_not_become_a_successful_chat_reply(monkeypatch, reason, text):
    final = SimpleNamespace(stop_reason=reason, content=[SimpleNamespace(type="text", text=text)])
    install_provider(monkeypatch, [tool("a", "jazz")], {"jazz": tracks("Jazz")}, final=final)
    response = request()
    assert response.status_code == 502
    assert response.json()["detail"] == "Music assistant provider unavailable"
