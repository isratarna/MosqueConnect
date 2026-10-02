import { AlertTriangle, RotateCw } from "lucide-react";

/** Grey placeholder lines shown while a card loads. */
export function Skeleton({ lines = 3, className = "" }) {
  return (
    <div className={`placeholder-glow ${className}`} aria-hidden="true">
      {Array.from({ length: lines }, (_, index) => (
        <span key={index} className="placeholder rounded d-block mb-2" style={{ width: `${[90, 70, 80, 60][index % 4]}%`, height: "0.95rem" }} />
      ))}
    </div>
  );
}

/**
 * A dashboard card that loads and fails on its own: while `loading` it shows
 * a skeleton, on `error` a message with Retry, otherwise its children.
 */
export default function DashboardCard({ title, icon: Icon, action, loading, error, onRetry, skeletonLines = 4, className = "", children }) {
  const headingId = `card-${String(title).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <section className={`card mc-dash-card ${className}`} aria-labelledby={headingId} aria-busy={loading ? "true" : undefined}>
      <div className="card-body">
        <div className="mc-dash-card__head">
          <h2 className="h6 fw-bold mb-0" id={headingId}>
            {Icon && <Icon size={17} className="text-mc me-2" aria-hidden="true" />}
            {title}
          </h2>
          {action}
        </div>
        {loading ? (
          <>
            <span className="visually-hidden" role="status">Loading {title}…</span>
            <Skeleton lines={skeletonLines} />
          </>
        ) : error ? (
          <div className="mc-dash-card__error" role="alert">
            <AlertTriangle size={18} aria-hidden="true" />
            <span>{typeof error === "string" ? error : `${title} could not be loaded.`}</span>
            {onRetry && (
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onRetry}>
                <RotateCw size={14} aria-hidden="true" /> Retry
              </button>
            )}
          </div>
        ) : children}
      </div>
    </section>
  );
}
