interface Props {
  score: number
  showTooltip?: boolean
}

function grade(score: number): { letter: string; color: string; bg: string } {
  if (score >= 80) return { letter: 'A', color: '#34d399', bg: 'rgba(52,211,153,0.15)' }
  if (score >= 60) return { letter: 'B', color: '#4facfe', bg: 'rgba(79,172,254,0.15)' }
  if (score >= 40) return { letter: 'C', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)' }
  return { letter: 'D', color: '#f87171', bg: 'rgba(248,113,113,0.15)' }
}

export default function QualityBadge({ score }: Props) {
  const g = grade(score)
  return (
    <span
      title={`Quality Score: ${score}/100 (${g.letter})`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 8,
        background: g.bg,
        fontSize: 12,
        fontWeight: 600,
        color: g.color,
        cursor: 'default',
      }}
    >
      {g.letter}
      <span style={{ fontSize: 10, opacity: 0.7 }}>{score}</span>
    </span>
  )
}
