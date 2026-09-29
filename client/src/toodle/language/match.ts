import { chatTokens, foldToken } from './normalize';

const FILLERS = new Set(['ra', 'rey', 'le', 'anna', 'akka', 'pls', 'please']);

function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 1) return 2;
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dp: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));
  for (let i = 0; i < rows; i += 1) dp[i][0] = i;
  for (let j = 0; j < cols; j += 1) dp[0][j] = j;
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[a.length][b.length];
}

function closeEnough(heard: string, target: string): boolean {
  if (heard === target) return true;
  if (heard.length < 6 || target.length < 6 || heard[0] !== target[0]) return false;
  if (heard.startsWith(target) || target.startsWith(heard)) {
    const extra = heard.length > target.length ? heard.slice(target.length) : target.slice(heard.length);
    if (extra.length > 0 && extra.length <= 2 && /^[aeiou]+$/.test(extra)) return true;
  }
  if (Math.abs(heard.length - target.length) > 1) return false;
  return editDistance(heard, target) === 1;
}

export function matchesAlias(message: string, alias: string): boolean {
  const words = chatTokens(message).filter((token) => !FILLERS.has(token)).map(foldToken);
  const aliasWords = chatTokens(alias).filter((token) => !FILLERS.has(token)).map(foldToken);
  if (words.length === 0 || aliasWords.length === 0) return false;
  const target = aliasWords.join('');
  if (target.length < 4) return words.some((word) => word === target);
  for (let i = 0; i < words.length; i += 1) {
    let acc = '';
    const max = Math.min(words.length, i + 6);
    for (let j = i; j < max; j += 1) {
      acc += words[j];
      if (closeEnough(acc, target)) return true;
      if (acc.length > target.length + 1) break;
    }
  }
  return false;
}
