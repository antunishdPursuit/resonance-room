from test_lastfm_responses import install_assistant, install_lastfm, request


def track_payload(title):
    return {"tracks": {"track": [{"name": title, "artist": {"name": "Artist"}}]}}


def test_broad_discovery_uses_charts_without_assuming_a_genre(monkeypatch):
    install_assistant(monkeypatch, {})
    outgoing = install_lastfm(monkeypatch, {"__chart__": track_payload("Chart track")})
    response = request()
    assert response.status_code == 200
    assert outgoing == [None]
    assert response.json()["recommendations"][0]["title"] == "Chart track"


def test_mood_only_chat_needs_no_genre_and_keeps_real_track_contract(monkeypatch):
    calls = install_assistant(monkeypatch, {"mood": "study"})
    install_lastfm(monkeypatch, {"study": track_payload("Real track")})
    response = request()
    assert response.status_code == 200
    assert response.json()["recommendations"] == [
        {"title": "Real track", "artist": "Artist", "url": ""}
    ]
    assert "genre" not in calls[0]["tools"][0]["input_schema"].get("required", [])
