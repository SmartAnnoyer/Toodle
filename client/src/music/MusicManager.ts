import { correctTime, livePosition } from './sync';
import type { MusicTrack, SharedMusicState } from './MusicTypes';

class MusicManager {
  private audio: HTMLAudioElement | null = null;
  private url = '';
  private level = 0.85;
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

  async start(track: MusicTrack, position = 0, loop = true) {
    const audio = this.element();
    if (!audio) return false;
    audio.loop = loop;
    await this.load(audio, track.audioUrl);
    const duration = this.duration() || track.duration;
    const at = duration > 0 ? Math.max(0, Math.min(duration, position)) : Math.max(0, position);
    if (Math.abs((audio.currentTime || 0) - at) > 0.05) audio.currentTime = at;
    try {
      await audio.play();
      return true;
    } catch {
      return false;
    }
  }

  pause() {
    this.audio?.pause();
  }

  setVolume(volume: number) {
    this.level = Math.min(1, Math.max(0, volume));
    if (this.audio) this.audio.volume = this.level;
  }

  async follow(state: SharedMusicState, now: number) {
    const audio = this.element();
    if (!audio || !state.audioUrl) return false;
    audio.loop = state.mode !== 'guess';
    const remote = livePosition(state, now);
    if (this.url !== state.audioUrl) {
      await this.load(audio, state.audioUrl);
      audio.currentTime = remote;
    } else {
      const next = correctTime(audio.currentTime || 0, remote);
      if (next != null) audio.currentTime = next;
    }
    if (state.status === 'playing') {
      if (!audio.paused) return true;
      try {
        await audio.play();
        return true;
      } catch {
        return false;
      }
    }
    if (!audio.paused) audio.pause();
    return true;
  }

  async resume() {
    const audio = this.audio;
    if (!audio) return false;
    try {
      await audio.play();
      return true;
    } catch {
      return false;
    }
  }

  stop() {
    const audio = this.audio;
    if (!audio) return;
    audio.loop = false;
    audio.pause();
    audio.currentTime = 0;
    this.url = '';
  }

  private load(audio: HTMLAudioElement, url: string) {
    if (this.url === url && audio.readyState >= 1) return Promise.resolve();
    this.url = url;
    audio.src = encodeURI(url);
    if (audio.readyState >= 1) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const done = () => resolve();
      audio.addEventListener('loadedmetadata', done, { once: true });
      audio.addEventListener('error', done, { once: true });
    });
  }

  private element() {
    if (this.audio || typeof Audio === 'undefined') return this.audio;
    const audio = new Audio();
    audio.preload = 'auto';
    audio.volume = this.level;
    audio.addEventListener('ended', () => this.onEnded?.());
    this.audio = audio;
    return audio;
  }
}

export const musicPlayer = new MusicManager();
