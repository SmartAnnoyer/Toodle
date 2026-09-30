import { correctTime, livePosition } from './sync';
import type { MusicTrack, SharedMusicState } from './MusicTypes';

class MusicManager {
  private audio: HTMLAudioElement | null = null;
  private url = '';
  private onEnded: (() => void) | null = null;

  bindEnded(handler: (() => void) | null) {
    this.onEnded = handler;
  }

  position(): number {
    return this.audio?.currentTime ?? 0;
  }

  duration(): number {
    const audio = this.audio;
    if (audio && Number.isFinite(audio.duration) && audio.duration > 0) return audio.duration;
    return 0;
  }

  async start(track: MusicTrack, position = 0) {
    const audio = this.element();
    if (!audio) return;
    if (this.url !== track.audioUrl) {
      this.url = track.audioUrl;
      audio.src = track.audioUrl;
    }
    audio.currentTime = Math.max(0, Math.min(track.duration, position));
    await audio.play().catch(() => undefined);
  }

  pause() {
    this.audio?.pause();
  }

  async follow(state: SharedMusicState, now: number) {
    const audio = this.element();
    if (!audio) return;
    const remote = livePosition(state, now);
    if (this.url !== state.audioUrl) {
      this.url = state.audioUrl;
      audio.src = state.audioUrl;
      audio.currentTime = remote;
    } else {
      const next = correctTime(audio.currentTime || 0, remote);
      if (next != null) audio.currentTime = next;
    }
    if (state.status === 'playing') {
      if (audio.paused) await audio.play().catch(() => undefined);
      return;
    }
    if (!audio.paused) audio.pause();
  }

  stop() {
    const audio = this.audio;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
  }

  private element() {
    if (this.audio || typeof Audio === 'undefined') return this.audio;
    const audio = new Audio();
    audio.preload = 'auto';
    audio.volume = 0.85;
    audio.addEventListener('ended', () => this.onEnded?.());
    this.audio = audio;
    return audio;
  }
}

export const musicPlayer = new MusicManager();
