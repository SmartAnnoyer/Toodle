import { LOCAL_TRACKS } from '../catalog';
import type { MusicProvider } from '../MusicProvider';
import type { MusicTrack } from '../MusicTypes';

function matches(track: MusicTrack, query: string) {
  const haystack = `${track.title} ${track.artist} ${track.mood ?? ''} ${track.energy}`.toLowerCase();
  return query.split(/\s+/).every((word) => haystack.includes(word));
}

/** Permitted in-app audio only. A licensed provider can implement the same interface later. */
export const localAudioProvider: MusicProvider = {
  async search(query: string) {
    const needle = query.trim().toLowerCase();
    if (!needle) return LOCAL_TRACKS;
    return LOCAL_TRACKS.filter((track) => matches(track, needle));
  },
  async getTrack(id: string) {
    return LOCAL_TRACKS.find((track) => track.id === id) ?? null;
  },
};
