"""Session-local track identities and stable artist-balanced candidate ordering."""


def artist_key(track):
    return " ".join(track["artist"].casefold().split())


def track_key(track):
    return (" ".join(track["title"].casefold().split()), artist_key(track))


def diverse_candidates(tracks, artist_counts=None):
    """Prefer less-seen artists, interleaving their tracks without dropping any."""
    counts = artist_counts or {}
    artists = {}
    for track in tracks:
        artists.setdefault(artist_key(track), []).append(track)
    ordered = sorted(artists, key=lambda artist: counts.get(artist, 0))
    return [
        artists[artist][row]
        for row in range(max((len(group) for group in artists.values()), default=0))
        for artist in ordered
        if row < len(artists[artist])
    ]
