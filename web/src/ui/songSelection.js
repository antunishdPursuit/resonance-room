export function songsMatch(firstSong, secondSong) {
  return Boolean(
    firstSong
    && secondSong
    && firstSong.title === secondSong.title
    && firstSong.artist === secondSong.artist
  )
}

export function isSongSelected(selectedSongs, song) {
  return Array.isArray(selectedSongs)
    && selectedSongs.some(selectedSong => songsMatch(selectedSong, song))
}

export function toggleSongSelection(selectedSongs, song) {
  const currentSelection = Array.isArray(selectedSongs) ? selectedSongs : []
  if (!song) return currentSelection

  if (isSongSelected(currentSelection, song)) {
    return currentSelection.filter(selectedSong => !songsMatch(selectedSong, song))
  }

  return [...currentSelection, song]
}

export function removeSongSelection(selectedSongs, song) {
  if (!Array.isArray(selectedSongs) || !song) return selectedSongs ?? []
  return selectedSongs.filter(selectedSong => !songsMatch(selectedSong, song))
}
