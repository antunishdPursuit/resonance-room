from backend.track_selection import artist_key, diverse_candidates, track_key


def recommendation_calls(content):
    calls = [block for block in content if block.type == "tool_use"]
    seen = set()
    if not 1 <= len(calls) <= 4:
        raise ValueError("Expected one to four recommendation calls")
    for call in calls:
        args = call.input
        if (
            call.name != "get_recommendations"
            or not isinstance(call.id, str)
            or not call.id.strip()
            or call.id in seen
            or not isinstance(args, dict)
            or set(args) - {"genre", "mood"}
            or any(
                not isinstance(value, str) or not value.strip() or len(value) > 64
                for value in args.values()
            )
        ):
            raise ValueError("Invalid recommendation call")
        seen.add(call.id)
    return calls


def recommendation_results(calls, groups, *, excluded_keys=(), artist_counts=None):
    groups = [diverse_candidates(group, artist_counts) for group in groups]
    selected = [[] for _ in groups]
    recommendations, seen, artists = [], set(excluded_keys), set()
    # Alternate among requested genres, preserving six unique display results.
    for row in range(max((len(group) for group in groups), default=0)):
        for index, group in enumerate(groups):
            if row >= len(group) or len(recommendations) == 6:
                continue
            track = group[row]
            key = track_key(track)
            artist = artist_key(track)
            if key in seen or artist in artists:
                continue
            seen.add(key)
            artists.add(artist)
            recommendations.append(track)
            selected[index].append(track)
    results = [
        {
            "type": "tool_result",
            "tool_use_id": call.id,
            "content": "\n".join(f"- {track['title']} by {track['artist']}" for track in tracks)
            or "No additional tracks selected for this request.",
        }
        for call, tracks in zip(calls, selected)
    ]
    return recommendations, results
