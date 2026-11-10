from types import SimpleNamespace

import anthropic
import httpx
import pytest

from backend import main as api
from test_api import request
from test_recommendation_tools import install_provider, tool


LIKES = [{"title": f"Liked {i}", "artist": f"Artist {i}"} for i in range(5)]
SUMMARY = "Your picks suggest expressive jazz vocals. No new matches were found in this search."


def payload(**changes):
    return {
        "messages": [{"role": "user", "content": "Describe my taste and recommend new jazz"}],
        "liked_songs": LIKES,
        "taste_summary": True,
        **changes,
    }


@pytest.mark.parametrize("pool", ["empty", "excluded", "partial", "full"])
def test_taste_summary_preserves_followup_with_zero_partial_or_full_results(monkeypatch, pool):
    records = (
        []
        if pool == "empty"
        else [{"name": song["title"], "artist": {"name": song["artist"]}} for song in LIKES]
    )
    if pool in ("partial", "full"):
        records += [
            {"name": f"New {i}", "artist": {"name": f"New artist {i}"}}
            for i in range(1 if pool == "partial" else 6)
        ]
    final = SimpleNamespace(
        stop_reason="end_turn", content=[SimpleNamespace(type="text", text=SUMMARY)]
    )
    calls, _ = install_provider(
        monkeypatch,
        [tool("jazz", "jazz"), tool("chill", "chill")],
        {"jazz": records},
        final=final,
    )
    response = request("POST", "/chat", json=payload())
    assert response.status_code == 200
    assert response.json()["response"] == SUMMARY
    songs = response.json()["recommendations"]
    assert len(songs) == {"empty": 0, "excluded": 0, "partial": 1, "full": 6}[pool]
    assert all(song["title"].startswith("New ") for song in songs)
    assert len(calls) == 2 and calls[1]["tool_choice"] == {"type": "none"}
    assert calls[0]["system"] == calls[1]["system"]
    assert "always summarize likely preferences" in calls[1]["system"]
    assert all(song["title"] in calls[1]["system"] for song in LIKES)
    results = calls[1]["messages"][-1]["content"]
    assert [result["tool_use_id"] for result in results] == ["jazz", "chill"]
    assert not any("Liked " in result["content"] for result in results)


def test_ordinary_no_match_with_five_likes_still_skips_followup(monkeypatch):
    calls, _ = install_provider(monkeypatch, [tool("a", "jazz")], {})
    response = request("POST", "/chat", json=payload(taste_summary=False))
    assert response.status_code == 200 and response.json()["recommendations"] == []
    assert "No unseen matching tracks" in response.json()["response"]
    assert len(calls) == 1


def test_summary_requires_five_distinct_likes_before_provider_work(monkeypatch):
    calls, _ = install_provider(monkeypatch, [tool("a", "jazz")], {})
    for likes in (
        LIKES[:4],
        [LIKES[0]] * 5,
        LIKES[:4] + [{"title": " LIKED 0 ", "artist": "ARTIST 0"}],
    ):
        response = request("POST", "/chat", json=payload(liked_songs=likes))
        assert response.status_code == 422
    assert calls == []


def test_data_provider_failure_does_not_become_no_match_summary(monkeypatch):
    calls, _ = install_provider(monkeypatch, [tool("a", "jazz")], {})

    async def fail(*args, **kwargs):
        raise api.ProviderError("Unavailable")

    monkeypatch.setattr(api, "fetch_tracks", fail)
    response = request("POST", "/chat", json=payload())
    assert response.status_code == 502
    assert response.json()["detail"] == "Music data provider unavailable"
    assert len(calls) == 1


def test_no_match_summary_followup_failure_is_not_a_success(monkeypatch):
    calls, _ = install_provider(monkeypatch, [tool("a", "jazz")], {})
    original = api._anthropic_client

    class Messages:
        async def create(self, **kwargs):
            if calls:
                raise anthropic.APIConnectionError(request=httpx.Request("POST", "https://test"))
            return await original().messages.create(**kwargs)

    monkeypatch.setattr(api, "_anthropic_client", lambda: SimpleNamespace(messages=Messages()))
    response = request("POST", "/chat", json=payload())
    assert response.status_code == 502
    assert response.json()["detail"] == "Music assistant provider unavailable"


@pytest.mark.parametrize("reason,text", [("end_turn", " "), ("max_tokens", "Partial")])
def test_incomplete_no_match_summary_is_rejected(monkeypatch, reason, text):
    final = SimpleNamespace(stop_reason=reason, content=[SimpleNamespace(type="text", text=text)])
    install_provider(monkeypatch, [tool("a", "jazz")], {}, final=final)
    assert request("POST", "/chat", json=payload()).status_code == 502
