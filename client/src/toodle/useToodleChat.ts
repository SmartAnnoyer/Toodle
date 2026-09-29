import { useEffect, useRef, useState } from 'react';
import type { ChatMessage, ConversationDetail } from '../types';
import { ToodleEngine } from './engine';
import { reactionForText } from './3d/intent';
import { feelTap, freshMemory, hearMessage } from './life';
import { looksSerious, mentionsFiveMinutes, mentionsGoodnight, notableWord, poseForEmoji } from './lines';
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
}: {
  conversation: ConversationDetail | null;
  messages: ChatMessage[];
  myId?: string;
  moodText?: string;
  draft: string;
  partnerTyping: boolean;
  streakPop: boolean;
  paused: boolean;
}) {
  const engine = useRef(new ToodleEngine());
  const memory = useRef(freshMemory());
  const script = useRef<ToodleBeat[]>([]);
  const [beat, setBeat] = useState<ToodleBeat | null>(null);
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
  const conversationId = conversation?.id;

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
    beatRef.current = next;
    setBeat(next);
  }

  function play(cues: ToodleBeat[]) {
    if (paused || cues.length === 0) return;
    script.current = cues.slice(1);
    beatRef.current = cues[0];
    setBeat(cues[0]);
  }

  function offer(cues: ToodleBeat[]) {
    if (paused || cues.length === 0) return;
    if (!beatRef.current) {
      play(cues);
      return;
    }
    if (cues[0].priority > beatRef.current.priority) script.current.push(...cues);
  }

  useEffect(() => {
    if (!beat) return;
    const handle = window.setTimeout(() => {
      const next = script.current.shift();
      if (next) {
        beatRef.current = next;
        setBeat(next);
        return;
      }
      beatRef.current = null;
      setBeat(null);
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
    script.current = [];
    beatRef.current = null;
    setBeat(null);
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
      if (message.senderId === myId && Date.now() - ackedAt.current < 4000) continue;
      const heard = hearMessage(message.body, memory.current, Date.now(), readChaos(), Math.random, {
        userId: message.senderId ?? undefined,
        recent,
      });
      if (heard?.length) {
        offer(heard);
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
      else if (message.senderId !== myId && !looksSerious(message.body)) {
        const pick = reactionForText(message.body);
        play([{
          event: 'HEARD',
          pose: 'happy',
          animation: pick.animation,
          prop: pick.prop,
          spot: 'composer',
          ms: 900,
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

  useEffect(() => {
    if (!conversationId) return;
    const handle = window.setInterval(() => {
      if (paused || beatRef.current || readChaos() === 'off') return;
      if (Math.random() > 0.28) return;
      const roll = Math.random();
      const animation = roll < 0.25 ? 'wink' : roll < 0.5 ? 'walk' : roll < 0.7 ? 'sleepy' : roll < 0.85 ? 'thinking' : 'dance';
      play([{
        event: 'HEARD',
        pose: 'happy',
        animation,
        spot: 'edge',
        ms: 1400,
        priority: 8,
      }]);
    }, 42_000);
    return () => window.clearInterval(handle);
  }, [conversationId, paused]);

  return {
    beat,
    notice(text: string) {
      const trimmed = text.trim();
      if (!trimmed || paused || readChaos() === 'off') return;
      if (beatRef.current && beatRef.current.priority >= 75) return;
      ackedAt.current = Date.now();
      const heard = hearMessage(trimmed, memory.current, Date.now(), readChaos(), Math.random, { userId: myId });
      if (heard?.length) {
        play(heard);
        return;
      }
      const pick = reactionForText(trimmed);
      play([
        {
          event: 'HEARD',
          pose: 'happy',
          animation: pick.animation,
          prop: pick.prop,
          spot: 'composer',
          ms: 800,
          priority: 52,
        },
        {
          event: 'HEARD',
          pose: 'thinking',
          animation: 'thinking',
          spot: 'composer',
          ms: 900,
          priority: 28,
        },
      ]);
    },
    poke() {
      if (paused || readChaos() === 'off' || Date.now() < memory.current.chaosUntil) return;
      const cues = feelTap(memory.current, Date.now());
      if (cues.length) play(cues);
    },
    dismiss() {
      script.current = [];
      beatRef.current = null;
      setBeat(null);
    },
  };
}
