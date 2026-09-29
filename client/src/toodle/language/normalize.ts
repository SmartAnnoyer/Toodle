/** Light cleanup for matching. The stored message is never rewritten. */
export function normalizeChatText(message: string): string {
  return message
    .toLowerCase()
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}]/gu, ' ')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/(.)\1{2,}/g, '$1$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Telugu romanization fold: aspiration, long vowels, and mashed repeats. */
export function foldToken(token: string): string {
  return token
    .replace(/aa/g, 'a')
    .replace(/ee/g, 'i')
    .replace(/ii/g, 'i')
    .replace(/oo/g, 'u')
    .replace(/uu/g, 'u')
    .replace(/th/g, 't')
    .replace(/dh/g, 'd')
    .replace(/bh/g, 'b')
    .replace(/ph/g, 'p')
    .replace(/(.)\1+/g, '$1');
}

export function chatTokens(message: string): string[] {
  return normalizeChatText(message).split(' ').filter(Boolean);
}
