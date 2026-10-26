export function nudge(pattern: number | number[] = 12) {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(pattern);
  }
}

export function buzz(kind: 'in' | 'out') {
  nudge(kind === 'in' ? [18, 40, 28] : [12, 36, 12, 36, 20]);
  void import('@capacitor/haptics').then(({ Haptics, ImpactStyle }) => Haptics.impact({
    style: kind === 'in' ? ImpactStyle.Medium : ImpactStyle.Heavy,
  })).catch(() => undefined);
}
