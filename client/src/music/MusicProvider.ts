import type { MusicTrack } from './MusicTypes';

export interface MusicProvider {
  search(query: string): Promise<MusicTrack[]>;
  getTrack(id: string): Promise<MusicTrack | null>;
}
