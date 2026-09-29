import { useEffect, useRef, useState } from 'react';
import type { ChatMessage, ConversationDetail } from '../types';
import { ToodleEngine } from './engine';
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
    beatRef.current = next;
    setBeat(next);
  }

  useEffect(() => {
    if (!beat) return;
    const handle = window.setTimeout(() => {
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

  return {
    beat,
    dismiss() {
      beatRef.current = null;
      setBeat(null);
    },
  };
}
