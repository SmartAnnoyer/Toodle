export type ChatBurstState = {
  token: number;
  emojis: string[];
  motion?: 'rise' | 'fall' | 'drift' | 'blink';
  density?: number;
  pop?: number;
};

type Piece = {
  id: string;
  emoji: string;
  left: number;
  delay: number;
  duration: number;
  size: number;
  drift: string;
  spin: string;
  pop: boolean;
};

function piecesFor(burst: ChatBurstState): Piece[] {
  let seed = burst.token % 2147483647 || 1;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const count = burst.density ?? 32;
  const popRate = burst.pop ?? 0.36;
  return Array.from({ length: count }, (_, index) => ({
    id: `${burst.token}-${index}`,
    emoji: burst.emojis[Math.floor(rand() * burst.emojis.length)] ?? '🎈',
    left: 2 + rand() * 94,
    delay: rand() * 0.85,
    duration: 3.3 + rand() * 1.7,
    size: 1.25 + rand() * 1.45,
    drift: `${Math.round(rand() * 72 - 36)}px`,
    spin: `${Math.round(rand() * 50 - 25)}deg`,
    pop: rand() < popRate,
  }));
}

export function ChatBurst({ burst }: { burst: ChatBurstState | null }) {
  if (!burst) return null;
  const pieces = piecesFor(burst);
  const motion = burst.motion ?? 'rise';
  return (
    <div className="chat-burst" aria-hidden>
      {pieces.map((piece) => (
        <span
          key={piece.id}
          className={motion === 'rise' && piece.pop ? 'balloon balloon-pop' : `balloon balloon-${motion}`}
          style={{
            left: motion === 'drift' ? '0' : `${piece.left}%`,
            top: motion === 'drift' ? `${8 + (piece.left % 70)}%` : motion === 'blink' ? `${18 + (piece.left % 48)}%` : undefined,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
            fontSize: `${piece.size}rem`,
            ['--drift' as string]: piece.drift,
            ['--spin' as string]: piece.spin,
          }}
        >
          {piece.emoji}
        </span>
      ))}
    </div>
  );
}
