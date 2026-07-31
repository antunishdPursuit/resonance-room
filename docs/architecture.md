# Resonance Room Architecture

## Architecture Overview

```mermaid
flowchart TD
    User([👤 User])

    subgraph FRONTEND ["Frontend — React + Three.js (port 5173)"]
        ChatUI[Conversation UI<br/>world-anchored response + transcript]
        LikedPanel[Liked Songs Panel<br/>pick ♡ / remove ♥]
        Avatar[VRM Avatar<br/>movement + animation + lip sync]
        Classroom[3D Classroom<br/>camera + collision map]
        RecommendationBoard[Six-song blackboard<br/>raycast selection]
        TTS[TTS Engine<br/>ElevenLabs or Browser]
    end

    subgraph BACKEND ["Backend — FastAPI (port 8001)"]
        FallbackCheck{API keys<br/>set?}
        HealthRoute["GET /health"]
        ChatRoute["POST /chat"]
        TTSRoute["POST /tts"]
    end

    subgraph AI_LAYER ["AI Layer"]
        Claude[Claude Haiku<br/>extracts genre + mood<br/>forms spoken reply]
        LastFM[Last.fm API<br/>fetches top tracks by tag]
    end

    subgraph FALLBACK ["Fallback Layer — no keys required"]
        KeywordMatch[Keyword Matcher<br/>lofi · pop · rock · sad ...]
        PythonRec[Python Recommender<br/>scores 18 songs from songs.csv]
    end

    subgraph TESTING ["Testing & Human Evaluation"]
        Pytest[pytest<br/>test_recommender.py]
        Profiles[6 Hardcoded Profiles<br/>3 realistic · 3 adversarial]
        HumanReview[👤 Human Review<br/>do results match expectations?]
    end

    %% Normal chat flow
    User -->|types message| ChatUI
    User -->|WASD or arrow keys| Classroom
    User -->|hover or click| RecommendationBoard
    Classroom --> Avatar
    ChatUI -->|POST /chat| ChatRoute
    ChatRoute --> FallbackCheck

    %% AI path
    FallbackCheck -->|yes| Claude
    Claude -->|tool call: get_recommendations| LastFM
    LastFM -->|track list| Claude
    Claude -->|response text + songs| ChatRoute

    %% Fallback path
    FallbackCheck -->|no| KeywordMatch
    KeywordMatch -->|matched profile| PythonRec
    PythonRec -->|top 6 songs + canned reply| ChatRoute

    %% Response back to user
    ChatRoute -->|response + song cards| ChatUI
    ChatUI --> RecommendationBoard
    RecommendationBoard --> LikedPanel
    ChatUI -->|trigger speech| TTS
    TTS -->|audio playback| Avatar
    Avatar -->|amplitude-driven jaw| Avatar

    %% Liked songs → profile trigger
    User -->|♡ picks a song| LikedPanel
    LikedPanel -->|5 picks → auto message| ChatRoute

    %% Voice
    User -->|POST /tts| TTSRoute
    TTSRoute -->|mp3 audio| TTS
    RenderHealth([Render health check]) --> HealthRoute

    %% Testing loop
    Pytest -->|validates scoring logic| PythonRec
    Profiles -->|run through recommender| PythonRec
    PythonRec -->|ranked results| HumanReview
    HumanReview -->|adjust weights or profiles| Profiles
```

---

## Component Summary

| Component | Role | Type |
| --- | --- | --- |
| **Conversation UI** | Accepts input and renders the current response, transcript, and song cards | Frontend |
| **Liked Songs Panel** | Tracks up to 5 picked songs; triggers profile message | Frontend |
| **Recommendation Board** | Displays six songs and shares selection state with the transcript | Frontend |
| **VRM Avatar** | Moves through the classroom with collision-aware locomotion, animation, blinking, and lip sync | Frontend |
| **Classroom Scene** | Renders the environment, orbit camera, inspection metadata, and collision zones | Frontend |
| **TTS Engine** | Speaks Esme's replies — ElevenLabs (natural) or browser (fallback) | Frontend |
| **FastAPI `/chat`** | Orchestrates Claude + Last.fm or routes to fallback | Backend |
| **FastAPI `/tts`** | Proxies text to ElevenLabs, returns mp3 | Backend |
| **Claude Haiku** | Extracts genre/mood via tool use, forms the spoken reply | AI Agent |
| **Last.fm API** | Retrieves real song recommendations by genre/mood tag | Retriever |
| **Keyword Matcher** | Maps user message words to the closest taste profile | Fallback |
| **Python Recommender** | Scores 18 songs against a profile; the product returns six | Fallback / Evaluator |
| **pytest suite** | Validates sorting, scoring, and explanation logic | Automated Testing |
| **6 Test Profiles** | Covers realistic and adversarial user types | Evaluation |
| **Human Review** | Checks whether ranked results match expected taste | Human-in-the-loop |

---

## Data Flow Summary

```
User message
    → Frontend (Chat UI)
    → Backend /chat
        → [keys set]   Claude extracts genre/mood → Last.fm fetches tracks → Claude forms reply
        → [no keys]    Keyword match → Python Recommender scores songs.csv
    → Response text + song list
    → Frontend renders cards + triggers Esme to speak
    → TTS audio → amplitude-driven lip sync on jaw bone
```

## Where Humans Are Involved

| Touch point | What the human does |
| --- | --- |
| **Chat input** | Sends natural language messages to Esme |
| **Song picks** | Chooses songs they like from recommendation cards |
| **Profile evaluation** | Reviews whether the 6 test profiles return sensible results |
| **Weight tuning** | Adjusts scoring weights in `recommender.py` based on observed bias |
