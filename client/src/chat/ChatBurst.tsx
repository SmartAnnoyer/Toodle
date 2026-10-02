export type ChatBurstState = {
  token: number;
  emojis: string[];
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
  return Array.from({ length: 32 }, (_, index) => ({
    id: `${burst.token}-${index}`,
    emoji: burst.emojis[Math.floor(rand() * burst.emojis.length)] ?? '🎈',
    left: 2 + rand() * 94,
    delay: rand() * 0.85,
    duration: 3.3 + rand() * 1.7,
    size: 1.25 + rand() * 1.45,
    drift: `${Math.round(rand() * 72 - 36)}px`,
    spin: `${Math.round(rand() * 50 - 25)}deg`,
    pop: rand() < 0.36,
  }));
}

export function ChatBurst({ burst }: { burst: ChatBurstState | null }) {
  if (!burst) return null;
  const pieces = piecesFor(burst);
  return (
    <div className="chat-burst" aria-hidden>
      {pieces.map((piece) => (
        <span
          key={piece.id}
          className={piece.pop ? 'balloon balloon-pop' : 'balloon'}
          style={{
            left: `${piece.left}%`,
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
