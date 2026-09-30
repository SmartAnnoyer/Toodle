export type MusicEnergy = 'calm' | 'normal' | 'energetic' | 'chaotic';

export type MusicMood = 'happy' | 'sad' | 'romantic' | 'chill' | 'energetic' | 'dramatic';

export type MusicControl = 'both' | 'hostOnly';

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  source: string;
  audioUrl: string;
  duration: number;
  energy: MusicEnergy;
  mood?: MusicMood;
  artwork?: string;
}

export interface SharedMusicState {
  conversationId: string;
  trackId: string;
  title: string;
  artist?: string;
  artwork?: string;
  audioUrl: string;
  duration: number;
  energy: MusicEnergy;
  mood?: MusicMood;
  status: 'playing' | 'paused';
  position: number;
  startedAt?: number;
  updatedBy?: string;
  version: number;
  control: MusicControl;
}

export interface MusicSnapshot {
  status: 'idle' | 'playing' | 'paused';
  energy: MusicEnergy;
  mood?: MusicMood;
  trackId?: string;
  title?: string;
}

export type ToodleMusicEvent =
  | 'music_started'
  | 'music_paused'
  | 'music_resumed'
  | 'music_changed'
  | 'music_seeked'
  | 'music_near_end'
  | 'music_finished'
  | 'music_long_play'
  | 'music_idle';
