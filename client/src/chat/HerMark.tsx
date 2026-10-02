export type HerMarkState = {
  token: number;
  line: string;
};

export function HerMark({ mark }: { mark: HerMarkState | null }) {
  if (!mark) return null;
  return (
    <div className="her-mark" key={mark.token} aria-hidden>
      <span>{mark.line}</span>
    </div>
  );
}
