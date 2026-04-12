interface PaginationBarProps {
  itemLabel?: string;
  onPageChange: (page: number) => void;
  page: number;
  pageSize: number;
  total: number;
}

export default function PaginationBar({
  itemLabel = "items",
  onPageChange,
  page,
  pageSize,
  total,
}: PaginationBarProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (totalPages <= 1) {
    return null;
  }

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="pagination-bar">
      <span className="pagination-summary">
        Showing {from}-{to} of {total.toLocaleString()} {itemLabel}
      </span>

      <div className="pagination-actions">
        <button
          className="btn-ghost"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          ← Prev
        </button>
        <span className="pagination-page">
          {page} / {totalPages}
        </span>
        <button
          className="btn-ghost"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
