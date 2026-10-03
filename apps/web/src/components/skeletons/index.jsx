import { useDelayedFlag } from "../../hooks/useDelayedFlag";

/** Grey shimmering block. Decorative: always aria-hidden. */
export function Skeleton({ width = "100%", height = "1rem", radius = "6px", className = "", style }) {
  return <span className={`mc-skeleton ${className}`} style={{ width, height, borderRadius: radius, ...style }} aria-hidden="true" />;
}

/** Stacked text lines; the last one is 60% wide. */
export function SkeletonText({ lines = 3 }) {
  return (
    <span className="mc-skeleton-text" aria-hidden="true">
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton key={index} height="0.8rem" width={index === lines - 1 && lines > 1 ? "60%" : "100%"} />
      ))}
    </span>
  );
}

/**
 * Wraps placeholders for assistive tech: announces `label` once, hides the shapes.
 * With `delay` (ms, default 150) nothing renders until loading has lasted that long.
 * Usage: <SkeletonRegion label="Loading mosques…" loading={loading}>…skeletons…</SkeletonRegion>
 */
export function SkeletonRegion({ label = "Loading…", loading = true, delay = 150, className = "", children }) {
  const visible = useDelayedFlag(loading, delay);
  if (!loading) return null;
  return (
    <div role="status" aria-busy="true" className={className}>
      <span className="visually-hidden">{label}</span>
      {visible && <div aria-hidden="true">{children}</div>}
    </div>
  );
}

// Same outer markup as the real cards so nothing shifts when data arrives.
export function MosqueCardSkeleton() {
  return (
    <div className="card mc-card h-100">
      <Skeleton className="mc-skeleton--img" height="180px" radius="0" />
      <div className="card-body d-flex flex-column gap-2">
        <Skeleton width="70%" height="1.1rem" />
        <Skeleton width="90%" height="0.8rem" />
        <Skeleton width="50%" height="0.8rem" />
        <div className="d-flex gap-2 mt-2"><Skeleton width="4rem" height="1.4rem" radius="999px" /><Skeleton width="4rem" height="1.4rem" radius="999px" /></div>
        <div className="mt-auto d-flex gap-2 pt-2"><Skeleton height="2rem" radius="8px" /><Skeleton width="2.4rem" height="2rem" radius="8px" /><Skeleton width="2.4rem" height="2rem" radius="8px" /></div>
      </div>
    </div>
  );
}

export function EventCardSkeleton() {
  return (
    <article className="mc-event-card mc-card mc-event-card--skeleton">
      <Skeleton width="30%" height="0.8rem" />
      <Skeleton width="70%" height="1.2rem" />
      <Skeleton width="45%" height="0.8rem" />
      <SkeletonText lines={3} />
    </article>
  );
}

export function CampaignCardSkeleton() {
  return (
    <article className="mc-campaign-card mc-card">
      <div className="mc-campaign-card__body d-grid gap-2">
        <Skeleton width="40%" height="0.8rem" />
        <Skeleton width="80%" height="1.3rem" />
        <SkeletonText lines={2} />
        <Skeleton height="0.6rem" radius="999px" />
        <Skeleton height="2.4rem" radius="8px" />
      </div>
    </article>
  );
}

/** Rows for the admin tables; render inside <tbody>. */
export function TableRowsSkeleton({ rows = 5, cols = 4 }) {
  return Array.from({ length: rows }, (_, row) => (
    <tr key={row} aria-hidden="true">
      {Array.from({ length: cols }, (_, col) => <td key={col}><Skeleton height="0.9rem" width={col === 0 ? "80%" : "60%"} /></td>)}
    </tr>
  ));
}

/** A few stacked blocks of the given heights (px), for forms and panels. */
export function BlockStack({ heights = [40, 160] }) {
  return <div className="d-grid gap-2">{heights.map((height, index) => <Skeleton key={index} height={`${height}px`} radius="8px" />)}</div>;
}

/** Stacked bordered rows (feeds, notifications, simple lists). */
export function ListRowsSkeleton({ rows = 3, className = "" }) {
  return (
    <div className={`d-grid gap-3 ${className}`}>
      {Array.from({ length: rows }, (_, index) => (
        <div className="mc-card p-3 d-grid gap-2" key={index}><Skeleton width="35%" height="0.8rem" /><Skeleton width="75%" height="1.1rem" /><SkeletonText lines={2} /></div>
      ))}
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="container py-4">
      <Skeleton height="220px" radius="12px" />
      <div className="row g-4 mt-1">
        <div className="col-lg-8 d-grid gap-3"><Skeleton width="50%" height="1.6rem" /><SkeletonText lines={4} /><Skeleton height="160px" radius="12px" /></div>
        <div className="col-lg-4 d-grid gap-3"><Skeleton height="200px" radius="12px" /><Skeleton height="120px" radius="12px" /></div>
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="card border-0 shadow-sm p-4 d-grid gap-2" aria-hidden="true">
      <Skeleton width="50%" height="0.8rem" />
      <Skeleton width="35%" height="2rem" />
    </div>
  );
}

/** Generic full-page placeholder for route fallbacks and detail pages. */
export function PageSkeleton({ label = "Loading page…" }) {
  return (
    <SkeletonRegion label={label} className="container py-5">
      <div className="d-grid gap-3"><Skeleton width="40%" height="2rem" /><SkeletonText lines={3} /><Skeleton height="240px" radius="12px" /></div>
    </SkeletonRegion>
  );
}
