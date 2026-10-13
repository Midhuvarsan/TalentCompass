interface Props {
  value: number; // 0 - 100
  label: string;
  /** "risk": lower is better. "match": higher is better. */
  kind: "risk" | "match";
  size?: number;
}

export function toneFor(kind: "risk" | "match", value: number): "good" | "warn" | "bad" {
  if (kind === "risk") return value >= 66 ? "bad" : value >= 33 ? "warn" : "good";
  return value >= 70 ? "good" : value >= 40 ? "warn" : "bad";
}

export default function ScoreRing({ value, label, kind, size = 64 }: Props) {
  const clamped = Math.max(0, Math.min(100, value));
  const stroke = 6;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const tone = toneFor(kind, clamped);
  return (
    <div
      className={`score-ring tone-${tone}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label}: ${clamped} out of 100`}
    >
      <svg width={size} height={size}>
        <circle className="track" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} />
        <circle
          className="bar"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - clamped / 100)}
        />
      </svg>
      <div className="score-ring-value">
        <b>{clamped}</b>
      </div>
    </div>
  );
}
