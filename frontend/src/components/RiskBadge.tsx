interface Props {
  score: number;
  label?: string;
}

export default function RiskBadge({ score, label = "Risk" }: Props) {
  let cls = "risk-low";
  let text = "Low Risk";
  if (score >= 66) {
    cls = "risk-high";
    text = "High Risk";
  } else if (score >= 33) {
    cls = "risk-medium";
    text = "Medium Risk";
  }
  return (
    <span className={`badge ${cls}`} title={`${label}: ${score}`}>
      <span className="dot" />
      {text}
    </span>
  );
}
