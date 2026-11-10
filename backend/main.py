import sys
import os
from collections import Counter
from urllib.parse import urlparse

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, StringConstraints
from typing import Annotated, Literal
import anthropic
import httpx
from dotenv import load_dotenv
from backend.recommendation_tools import recommendation_calls, recommendation_results
from backend.discovery import discover, is_bare_music_request
from backend.track_selection import artist_key, track_key

load_dotenv()

app = FastAPI(title="Resonance Room API")

LOCAL_FRONTEND_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
]


def frontend_origins(configured_origins: str | None = None) -> list[str]:
    origins = list(LOCAL_FRONTEND_ORIGINS)
    raw_origins = (
        os.getenv("FRONTEND_ORIGINS", "") if configured_origins is None else configured_origins
    )
    for raw_origin in raw_origins.split(","):
        origin = raw_origin.strip().rstrip("/")
        if origin and origin not in origins:
            origins.append(origin)
    return origins


app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_origins(),
    allow_methods=["*"],
    allow_headers=["*"],
)

LASTFM_BASE = "https://ws.audioscrobbler.com/2.0/"
LASTFM_HEADERS = {
    "User-Agent": "ResonanceRoom/1.0 (https://github.com/antunishdPursuit/resonance-room)",
}
PROVIDER_TIMEOUT = httpx.Timeout(15.0)


class ProviderError(RuntimeError):
    """An external provider failed without exposing its response to the client."""


def _anthropic_client() -> anthropic.AsyncAnthropic:
    return anthropic.AsyncAnthropic(
        api_key=os.environ["ANTHROPIC_API_KEY"],
        timeout=PROVIDER_TIMEOUT,
        max_retries=1,
    )


SYSTEM_PROMPT = (
    "You are Riri, a warm and friendly music assistant. "
    "IMPORTANT: Whenever the user mentions music, songs, artists, genres, moods, or asks what to listen to, "
    "you MUST call the get_recommendations tool — never answer music questions from your own knowledge. "
    "After getting results, respond in 2 sentences max since your words are spoken aloud. "
    "Mention 1 or 2 song titles by name to make it feel personal. "
    "Only supply a genre the user actually requested; never infer one from a mood or activity. "
    "Use mood for activities such as focused, chill, energetic, happy, sad or relaxed. "
    "Omit both criteria for broad discovery. Results use community tag evidence, not measured "
    "audio features. Do not claim verified energy or mood; acknowledge fewer matches when needed. "
    "Only mention songs supplied in the latest tool results. Those results exclude the "
    "session's seen and liked songs and contain at most one song per artist. "
    "If results are sparse, do not invent additional songs or promise more than was returned."
)

TOOLS = [
    {
        "name": "get_recommendations",
        "description": (
            "Fetch real tracks from Last.fm using an optional explicit genre and mood/activity. "
            "Omit genre when none was requested; omit both for broad discovery. "
            "Use this whenever the user asks for music suggestions."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "genre": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 64,
                    "description": "Music genre, e.g. lofi, pop, rock, jazz, hip-hop, classical, electronic",
                },
                "mood": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 64,
                    "description": "Optional mood or vibe, e.g. chill, happy, energetic, sad, focused",
                },
            },
            "additionalProperties": False,
        },
    }
]

# Keywords that signal a music-related request. When matched, tool_choice is
# forced to "any" so Claude cannot answer from training knowledge instead of
# calling get_recommendations.
MUSIC_KEYWORDS = {
    "music",
    "song",
    "songs",
    "track",
    "tracks",
    "artist",
    "listen",
    "recommend",
    "recommendation",
    "playlist",
    "genre",
    "lofi",
    "pop",
    "rock",
    "jazz",
    "hip-hop",
    "electronic",
    "classical",
    "chill",
    "energetic",
    "sad",
    "happy",
    "vibe",
    "beats",
    "albums",
    "album",
    "rapper",
    "band",
    "singer",
    "tune",
    "tunes",
}


async def fetch_tracks(tag: str | None, limit: int = 6) -> list:
    """Use tag discovery, or charts when no preference was supplied."""
    api_key = os.getenv("LASTFM_API_KEY")
    try:
        async with httpx.AsyncClient(
            timeout=PROVIDER_TIMEOUT, headers=LASTFM_HEADERS, follow_redirects=False
        ) as http:
            resp = await http.get(
                LASTFM_BASE,
                params={
                    "method": "tag.gettoptracks" if tag is not None else "chart.gettoptracks",
                    **({"tag": tag.lower()} if tag is not None else {}),
                    "api_key": api_key,
                    "format": "json",
                    "limit": limit,
                },
            )
            resp.raise_for_status()
            payload = resp.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise ProviderError("Last.fm request failed") from exc

    if not isinstance(payload, dict) or "error" in payload:
        raise ProviderError("Last.fm returned an error response")
    container = payload.get("tracks")
    if not isinstance(container, dict) or not isinstance(container.get("track"), list):
        raise ProviderError("Last.fm returned an unexpected response")
    return container["track"]


async def fetch_track_tags(track: dict) -> list[str]:
    """Unusable optional metadata is unknown, never synthetic evidence."""
    try:
        async with httpx.AsyncClient(
            timeout=PROVIDER_TIMEOUT, headers=LASTFM_HEADERS, follow_redirects=False
        ) as http:
            resp = await http.get(
                LASTFM_BASE,
                params={
                    "method": "track.gettoptags",
                    "artist": track["artist"],
                    "track": track["title"],
                    "api_key": os.getenv("LASTFM_API_KEY"),
                    "format": "json",
                },
            )
            resp.raise_for_status()
            payload = resp.json()
    except (httpx.HTTPError, ValueError):
        return []
    if not isinstance(payload, dict) or "error" in payload:
        return []
    container = payload.get("toptags")
    records = container.get("tag") if isinstance(container, dict) else None
    if not isinstance(records, list):
        return []
    tags = []
    for record in records[:64]:
        if not isinstance(record, dict) or not isinstance(record.get("name"), str):
            continue
        try:
            count = int(record.get("count", 0))
        except (ValueError, TypeError, OverflowError):
            continue
        name = record["name"].strip()
        if 0 < len(name) <= 64 and count > 0:
            tags.append((name, count))
    threshold = max((count for _, count in tags), default=0) * 0.1
    return [name for name, count in tags if count >= threshold]


def _format_tracks(tracks: list) -> list[dict]:
    """Return only complete track records that the frontend can display safely."""
    formatted = []
    for track in tracks:
        name = track.get("name") if isinstance(track, dict) else None
        artist = track.get("artist", {}) if isinstance(track, dict) else {}
        artist_name = artist.get("name") if isinstance(artist, dict) else None
        if (
            isinstance(name, str)
            and name.strip()
            and len(name.strip()) <= 512
            and isinstance(artist_name, str)
            and artist_name.strip()
            and len(artist_name.strip()) <= 512
        ):
            raw_url = track.get("url", "")
            safe_url = ""
            if isinstance(raw_url, str):
                try:
                    parsed_url = urlparse(raw_url)
                    hostname = parsed_url.hostname or ""
                    if parsed_url.scheme == "https" and (
                        hostname == "last.fm" or hostname.endswith(".last.fm")
                    ):
                        safe_url = raw_url
                except ValueError:
                    pass
            formatted.append(
                {"title": name.strip(), "artist": artist_name.strip(), "url": safe_url}
            )
    return formatted


class Message(BaseModel):
    role: Literal["user", "assistant"]
    content: Annotated[str, Field(min_length=1, max_length=2000)]


class SongIdentity(BaseModel):
    title: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=512)]
    artist: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=512)]


class ChatRequest(BaseModel):
    messages: Annotated[list[Message], Field(min_length=1, max_length=20)]
    seen_songs: Annotated[list[SongIdentity], Field(max_length=120)] = Field(default_factory=list)
    liked_songs: Annotated[list[SongIdentity], Field(max_length=120)] = Field(default_factory=list)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/chat")
async def chat(request: ChatRequest):
    """
    Two-pass Claude conversation with tool use.

    Pass 1: Send the conversation history. If the message contains music keywords,
            force tool_choice="any" so Claude must call get_recommendations.
    Pass 2: After fetching tracks from Last.fm, send the tool result back so
            Claude can form a natural spoken response that names specific songs.
    """
    if not all(os.getenv(key, "").strip() for key in ("ANTHROPIC_API_KEY", "LASTFM_API_KEY")):
        raise HTTPException(
            status_code=503,
            detail="Local AI recommendations require ANTHROPIC_API_KEY and LASTFM_API_KEY.",
        )

    history = [{"role": m.role, "content": m.content} for m in request.messages]
    session_tracks = {
        track_key(song.model_dump()): song.model_dump()
        for song in [*request.seen_songs, *request.liked_songs]
    }
    artist_counts = Counter(artist_key(song) for song in session_tracks.values())

    last_msg = request.messages[-1].content.lower()
    # Bare activity replies fit the composer's music context; longer activity
    # questions stay optional so ordinary nonmusic chat is not forced into a lookup.
    is_music = any(kw in last_msg for kw in MUSIC_KEYWORDS) or is_bare_music_request(last_msg)
    tool_choice = {"type": "any"} if is_music else {"type": "auto"}

    client = _anthropic_client()
    try:
        response = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=512,
            system=SYSTEM_PROMPT,
            tools=TOOLS,
            tool_choice=tool_choice,
            messages=history,
        )
    except anthropic.APIError as exc:
        raise HTTPException(status_code=502, detail="Music assistant provider unavailable") from exc

    recommendations = None

    if response.stop_reason == "tool_use":
        try:
            tool_blocks = recommendation_calls(response.content)
        except ValueError as exc:
            raise HTTPException(
                status_code=502, detail="Music assistant provider unavailable"
            ) from exc

        try:
            groups = await discover(
                tool_blocks,
                fetch_tracks,
                fetch_track_tags,
                _format_tracks,
                excluded_keys=session_tracks,
                artist_counts=artist_counts,
            )
        except (ProviderError, TimeoutError) as exc:
            raise HTTPException(status_code=502, detail="Music data provider unavailable") from exc

        recommendations, tool_results = recommendation_results(
            tool_blocks,
            groups,
            excluded_keys=session_tracks,
            artist_counts=artist_counts,
        )
        if not recommendations:
            return {
                "response": (
                    "No unseen matching tracks found. Try another genre or mood."
                    if session_tracks
                    else "No matching tracks found. Try another genre or mood."
                ),
                "recommendations": [],
            }

        try:
            response = await client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=256,
                system=SYSTEM_PROMPT,
                tools=TOOLS,
                tool_choice={"type": "none"},
                messages=history
                + [
                    {"role": "assistant", "content": response.content},
                    {"role": "user", "content": tool_results},
                ],
            )
        except anthropic.APIError as exc:
            raise HTTPException(
                status_code=502, detail="Music assistant provider unavailable"
            ) from exc

    text = next((b.text for b in response.content if hasattr(b, "text")), "")
    if response.stop_reason != "end_turn" or not isinstance(text, str) or not text.strip():
        raise HTTPException(status_code=502, detail="Music assistant provider unavailable")
    return {"response": text, "recommendations": recommendations}


class TTSRequest(BaseModel):
    text: Annotated[str, Field(min_length=1, max_length=1000)]


@app.get("/tts/available")
def tts_available():
    return {"elevenlabs": bool(os.getenv("ELEVENLABS_API_KEY"))}


@app.post("/tts")
async def tts(req: TTSRequest):
    api_key = os.getenv("ELEVENLABS_API_KEY")
    if not api_key:
        raise HTTPException(status_code=501, detail="ELEVENLABS_API_KEY not configured")

    voice_id = os.getenv("ELEVENLABS_VOICE_ID", "")

    try:
        async with httpx.AsyncClient(timeout=PROVIDER_TIMEOUT) as http:
            if not voice_id:
                voices_resp = await http.get(
                    "https://api.elevenlabs.io/v1/voices",
                    headers={"xi-api-key": api_key},
                )
                voices_resp.raise_for_status()
                voices = voices_resp.json().get("voices", [])
                if not voices:
                    raise ProviderError("ElevenLabs returned no voices")
                voice_id = voices[0]["voice_id"]

            resp = await http.post(
                f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
                headers={"xi-api-key": api_key, "Content-Type": "application/json"},
                json={
                    "text": req.text,
                    "model_id": "eleven_turbo_v2",
                    "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
                },
            )
            resp.raise_for_status()
    except (httpx.HTTPError, ValueError, KeyError, ProviderError) as exc:
        raise HTTPException(status_code=502, detail="Voice provider unavailable") from exc

    return Response(content=resp.content, media_type="audio/mpeg")
