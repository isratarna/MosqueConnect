export default function VerifiedBadge({ className = "" }) {
  return (
    <span
      className={`d-inline-flex align-items-center rounded-pill px-2 py-1 small fw-semibold text-success bg-success bg-opacity-10 border border-success border-opacity-25 ${className}`.trim()}
      title="Verified by MosqueConnect"
    >
      <i className="bi bi-patch-check-fill me-1" />
      Verified
    </span>
  );
}
