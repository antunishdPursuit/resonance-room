def recommendation_calls(content):
    calls = [block for block in content if block.type == "tool_use"]
    seen = set()
    if not calls:
        raise ValueError("Missing recommendation calls")
    for call in calls:
        args = call.input
        if (
            call.name != "get_recommendations"
            or not isinstance(call.id, str)
            or not call.id.strip()
            or call.id in seen
            or not isinstance(args, dict)
            or not isinstance(args.get("genre"), str)
            or not args["genre"].strip()
            or (args.get("mood") is not None and not isinstance(args["mood"], str))
        ):
            raise ValueError("Invalid recommendation call")
        seen.add(call.id)
    return calls


def recommendation_results(calls, groups):
    selected = [[] for _ in groups]
    recommendations, seen = [], set()
    # Alternate among requested genres, preserving six unique display results.
    for row in range(max((len(group) for group in groups), default=0)):
        for index, group in enumerate(groups):
            if row >= len(group) or len(recommendations) == 6:
                continue
            track = group[row]
            key = (str(track["title"]).casefold(), str(track["artist"]).casefold())
            if key in seen:
                continue
            seen.add(key)
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
