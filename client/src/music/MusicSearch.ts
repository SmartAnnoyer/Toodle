import { localAudioProvider } from './providers/LocalAudioProvider';
import type { MusicProvider } from './MusicProvider';
import type { MusicTrack } from './MusicTypes';

let provider: MusicProvider = localAudioProvider;

export function useMusicProvider(next: MusicProvider) {
  provider = next;
}

export function searchTracks(query: string): Promise<MusicTrack[]> {
  return provider.search(query);
}

export function getTrack(id: string): Promise<MusicTrack | null> {
  return provider.getTrack(id);
}
