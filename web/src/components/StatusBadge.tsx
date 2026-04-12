import clsx from 'clsx'

const statusStyles: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  processing: 'bg-yellow-100 text-yellow-700',
  qualified: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-green-100 text-green-700',
  deposited: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  fraud: 'bg-red-200 text-red-800',
  duplicate: 'bg-orange-100 text-orange-700',
  invalid: 'bg-gray-100 text-gray-600',
}

interface StatusBadgeProps {
  status: string
  className?: string
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const style = statusStyles[status.toLowerCase()] || 'bg-gray-100 text-gray-600'

  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
        style,
        className
      )}
    >
      {status}
    </span>
  )
}
