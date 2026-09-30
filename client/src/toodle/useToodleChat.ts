import { useEffect, useRef, useState } from 'react';
import type { ChatMessage, ConversationDetail } from '../types';
import { ToodleEngine } from './engine';
import { reactionForText } from './3d/intent';
import { explainToodleReaction, feelTap, freshMemory, hearMessage, keywordHit } from './life';
import { looksSerious, mentionsFiveMinutes, mentionsGoodnight, notableWord, poseForEmoji } from './lines';
import type { MusicSnapshot, ToodleMusicEvent } from '../music/MusicTypes';
import { toodleAudio } from './audio/ToodleAudioEngine';
import { shouldPopIncoming } from './audio/ToodleAudioState';
import { ambientVibeBeat, decideMusicReaction, musicComboBeat } from './music/reactions';
import { readChaos } from './settings';
import type { ToodleBeat, ToodleContext, ToodleEvent } from './types';

export function useToodleChat({
  conversation,
  messages,
  myId,
  moodText,
  draft,
  partnerTyping,
  streakPop,
  paused,
  musicRef,
  musicTick,
}: {
  conversation: ConversationDetail | null;
  messages: ChatMessage[];
  myId?: string;
  moodText?: string;
  draft: string;
  partnerTyping: boolean;
  streakPop: boolean;
  paused: boolean;
  musicRef: { current: MusicSnapshot | null };
  musicTick: number;
}) {
  const engine = useRef(new ToodleEngine());
  const memory = useRef(freshMemory());
  const script = useRef<ToodleBeat[]>([]);
  const [beat, setBeat] = useState<ToodleBeat | null>(null);
  const [waiting, setWaiting] = useState(false);
  const beatRef = useRef<ToodleBeat | null>(null);
  const seriousUntil = useRef(0);
  const counts = useRef(new Map<string, number>());
  const seen = useRef(new Set<string>());
  const booted = useRef(false);
  const sendTimes = useRef<number[]>([]);
  const typingSince = useRef<number | null>(null);
  const partnerSince = useRef<number | null>(null);
  const longFired = useRef(false);
  const prevDraft = useRef('');
  const deletes = useRef<number[]>([]);
  const milestone = useRef(false);
  const ackedAt = useRef(0);
  const longChat = useRef(false);
  const musicCool = useRef(new Map<string, number>());
  const conversationId = conversation?.id;

  function decorate(cues: ToodleBeat[]) {
    const extra = musicComboBeat(cues[0]?.reactionId, musicRef.current, Math.random());
    return extra ? [...cues, extra] : cues;
  }

  function vibeAfter() {
    const music = musicRef.current;
    if (!music || music.status !== 'playing' || readChaos() === 'off') return null;
    return ambientVibeBeat(music);
  }

  function present(next: ToodleBeat | null) {
    beatRef.current = next;
    setBeat(next);
    toodleAudio.playBeat(next);
  }

  function show(event: ToodleEvent, context?: ToodleContext) {
    if (paused) return;
    const next = engine.current.decide({
      event,
      now: Date.now(),
      chaos: readChaos(),
      serious: Date.now() < seriousUntil.current,
      context,
    });
    if (!next) return;
    if (beatRef.current && beatRef.current.priority >= next.priority) return;
    script.current = [];
    present(next);
  }

  function play(cues: ToodleBeat[]) {
    if (paused || cues.length === 0) return;
    script.current = cues.slice(1);
    present(cues[0]);
  }

  function offer(cues: ToodleBeat[]) {
    if (paused || cues.length === 0) return;
    if (!beatRef.current || cues[0].priority > beatRef.current.priority) {
      play(cues);
      return;
    }
    script.current.push(...cues);
  }

  useEffect(() => {
    if (!beat) return;
    const handle = window.setTimeout(() => {
      const next = script.current.shift() ?? vibeAfter();
      present(next);
    }, beat.ms);
    return () => window.clearTimeout(handle);
  }, [beat]);

  useEffect(() => {
    booted.current = false;
    seen.current = new Set();
    counts.current = new Map();
    milestone.current = false;
    longChat.current = false;
    engine.current = new ToodleEngine();
    memory.current = freshMemory();
    musicCool.current = new Map();
    script.current = [];
    present(null);
    setWaiting(false);
  }, [conversationId]);

  useEffect(() => {
    if (!conversation) return;
    const fresh = messages.filter((message) => !seen.current.has(message.id));
    if (!booted.current) {
      for (const message of messages) {
        seen.current.add(message.id);
        if (message.kind === 'text') notableWord(message.body, counts.current);
      }
      booted.current = true;
      if (messages.length === 0) show('CHAT_OPENED');
      return;
    }
    for (const message of fresh) {
      const mine = message.senderId === myId;
      if (shouldPopIncoming({
        mine,
        system: message.kind === 'system',
        alreadySeen: false,
        booted: true,
      })) toodleAudio.noteIncoming();
      seen.current.add(message.id);
      if (message.kind === 'gif' || message.kind === 'sticker') {
        show('GIF_SENT');
        continue;
      }
      if (message.kind !== 'text') continue;
      if (looksSerious(message.body)) seriousUntil.current = Date.now() + 10 * 60_000;
      const hit = notableWord(message.body, counts.current);
      const texts = messages.filter((item) => item.kind === 'text');
      const index = texts.findIndex((item) => item.id === message.id);
      const recent = texts.slice(Math.max(0, index - 4), index).map((item) => item.body);
      if (message.senderId !== myId) setWaiting(false);
      if (message.senderId === myId && Date.now() - ackedAt.current < 4000) continue;
      const heard = hearMessage(message.body, memory.current, Date.now(), readChaos(), Math.random, {
        userId: message.senderId ?? undefined,
        recent,
      });
      if (heard?.length) {
        offer(decorate(heard));
        continue;
      }
      if (message.senderId === myId) {
        const now = Date.now();
        sendTimes.current = [...sendTimes.current.filter((time) => now - time < 10_000), now];
      }
      const rapid = message.senderId === myId && sendTimes.current.length >= 3;
      const emojiOnly = message.body.trim().length <= 8 && poseForEmoji(message.body) !== 'happy';
      if (mentionsGoodnight(message.body)) show('GOODNIGHT');
      else if (mentionsFiveMinutes(message.body)) show('LATE_CLAIM');
      else if (message.body.startsWith('/')) show('SHORTCUT_USED');
      else if (hit) show('WORD_REPEATED', hit);
      else if (rapid) show('USER_SENT_MANY_MESSAGES');
      else if (message.body.length > 280) show('LONG_MESSAGE');
      else if (emojiOnly) show('EMOJI_REACT', { emoji: message.body });
      else if (musicRef.current?.status === 'playing') {
        continue;
      }
      else if (message.senderId !== myId && !looksSerious(message.body) && !keywordHit(message.body)) {
        const pick = reactionForText(message.body);
        offer([{
          event: 'HEARD',
          pose: 'happy',
          animation: pick.animation === 'happy' ? 'celebrate' : pick.animation,
          prop: pick.prop,
          spot: 'composer',
          ms: 1000,
          priority: 48,
        }]);
      }
    }
    if (messages.length >= 100 && !milestone.current) {
      milestone.current = true;
      show('MESSAGE_MILESTONE', { count: messages.length });
    }
    if (messages.length >= 60 && !longChat.current) {
      longChat.current = true;
      show('CHAT_ACTIVE_LONG');
    }
  }, [messages, conversation, myId, paused]);

  useEffect(() => {
    if (!draft.trim()) {
      typingSince.current = null;
      if (!partnerTyping) longFired.current = false;
    } else if (!typingSince.current) {
      typingSince.current = Date.now();
    }
    const prev = prevDraft.current;
    if (prev.length - draft.length >= 12) {
      const now = Date.now();
      deletes.current = [...deletes.current.filter((time) => now - time < 20_000), now];
      if (deletes.current.length >= 2) show('USER_DELETED_DRAFT');
    }
    prevDraft.current = draft;
    if (looksSerious(draft)) seriousUntil.current = Date.now() + 10 * 60_000;
  }, [draft, paused]);

  useEffect(() => {
    if (partnerTyping) {
      if (!partnerSince.current) partnerSince.current = Date.now();
    } else {
      partnerSince.current = null;
      if (!draft.trim()) longFired.current = false;
    }
  }, [partnerTyping, draft]);

  useEffect(() => {
    if (!draft.trim() && !partnerTyping) return;
    const handle = window.setInterval(() => {
      const localLong = typingSince.current != null && Date.now() - typingSince.current > 7000;
      const partnerLong = partnerSince.current != null && Date.now() - partnerSince.current > 7000;
      if ((localLong || partnerLong) && !longFired.current) {
        longFired.current = true;
        show('USER_TYPING_TOO_LONG');
      }
    }, 1000);
    return () => window.clearInterval(handle);
  }, [draft, partnerTyping, paused]);

  useEffect(() => {
    if (!conversation || messages.length < 2) return;
    const handle = window.setTimeout(() => show('CHAT_IDLE'), 4 * 60_000);
    return () => window.clearTimeout(handle);
  }, [messages.length, conversationId, paused]);

  useEffect(() => {
    if (!conversationId) return;
    const handle = window.setTimeout(() => show('CHAT_ACTIVE_LONG'), 20 * 60_000);
    return () => window.clearTimeout(handle);
  }, [conversationId, paused]);

  useEffect(() => {
    toodleAudio.setMusicActive(musicRef.current?.status === 'playing');
    if (musicRef.current?.status !== 'playing') return;
    const handle = window.setInterval(() => {
      if ((beatRef.current?.priority ?? 0) > 30) return;
      const beats = decideMusicReaction({
        event: 'music_idle',
        energy: musicRef.current?.energy ?? 'normal',
        mood: musicRef.current?.mood,
        now: Date.now(),
        random: Math.random(),
        cooldowns: musicCool.current,
        performing: beatRef.current?.priority ?? 0,
      });
      if (beats?.length) offer(beats);
    }, 45_000);
    return () => window.clearInterval(handle);
  }, [musicTick, paused]);

  useEffect(() => {
    if (!streakPop || !conversation) return;
    show('STREAK_INCREASED', { streak: conversation.streakCount });
  }, [streakPop, conversation?.streakCount]);

  useEffect(() => {
    if (!conversation?.streakAtRisk) return;
    show('STREAK_AT_RISK');
  }, [conversation?.streakAtRisk, conversationId]);

  useEffect(() => {
    if (!conversation?.expiresAt || conversation.status !== 'active') return;
    const left = new Date(conversation.expiresAt).getTime() - Date.now();
    if (left > 0 && left <= 5 * 60_000) show('CONVERSATION_EXPIRING', { secondsLeft: Math.round(left / 1000) });
  }, [conversation?.expiresAt, conversation?.status, conversationId]);

  useEffect(() => {
    if (!moodText || !conversationId) return;
    const key = 'toodle-mood';
    const previous = sessionStorage.getItem(key);
    sessionStorage.setItem(key, moodText);
    if (previous && previous !== moodText) show('MOOD_CHANGED', { moodText });
  }, [moodText, conversationId]);

  return {
    beat,
    waiting,
    notice(text: string) {
      const trimmed = text.trim();
      if (!trimmed || paused || readChaos() === 'off') return;
      ackedAt.current = Date.now();
      toodleAudio.unlock();
      setWaiting(true);
      const decision = explainToodleReaction(trimmed, memory.current, Date.now(), readChaos(), Math.random, { userId: myId });
      if (decision.beats?.length) {
        offer(decorate(decision.beats));
        return;
      }
      if (decision.detected.length || keywordHit(trimmed)) return;
      if (musicRef.current?.status === 'playing') return;
      const pick = reactionForText(trimmed);
      play([
        {
          event: 'HEARD',
          pose: 'happy',
          animation: pick.animation === 'happy' ? 'bounce' : pick.animation,
          prop: pick.prop,
          spot: 'composer',
          ms: 700,
          priority: 52,
        },
      ]);
    },
    noteMusic(event: ToodleMusicEvent) {
      if (paused || readChaos() === 'off') return;
      const music = musicRef.current;
      const beats = decideMusicReaction({
        event,
        energy: music?.energy ?? 'normal',
        mood: music?.mood,
        now: Date.now(),
        random: Math.random(),
        cooldowns: musicCool.current,
        performing: beatRef.current?.priority ?? 0,
      });
      if (beats?.length) offer(beats);
    },
    poke() {
      if (paused || readChaos() === 'off' || Date.now() < memory.current.chaosUntil) return;
      toodleAudio.unlock();
      const cues = feelTap(memory.current, Date.now());
      if (cues.length) play(cues);
    },
    dismiss() {
      script.current = [];
      present(vibeAfter());
    },
  };
}
