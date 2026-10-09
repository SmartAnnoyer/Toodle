import type { ChatMessage, ConversationDetail, ConversationSummary } from '../types';

type Thread = { conversation: ConversationDetail; messages: ChatMessage[] };
type Inbox = { conversations: ConversationSummary[]; pending: number };

const threads = new Map<string, Thread>();
let inbox: Inbox | null = null;

export function readThread(id: string) {
  return threads.get(id) ?? null;
}

export function writeThread(id: string, thread: Thread) {
  threads.set(id, thread);
}

export function readInbox() {
  return inbox;
}

export function writeInbox(next: Inbox) {
  inbox = next;
}
