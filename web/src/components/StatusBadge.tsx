interface StatusBadgeProps {
  status: string
  className?: string
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const s = status.toLowerCase()
  return (
    <span className={`status-badge ${s} ${className ?? ''}`}>
      {status}
    </span>
  )
}
