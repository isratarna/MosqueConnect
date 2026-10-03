import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../../utils/api";
import { ListRowsSkeleton, SkeletonRegion } from "../skeletons";

const STATUS = { pending: ["Waiting for review", "bg-warning text-dark"], approved: ["Approved", "bg-success"], rejected: ["Not approved", "bg-secondary"] };

/**
 * [Urmee · F3 Part 3] The user's "Suggest a mosque" submissions with their status
 * (GET /api/me/mosque-suggestions), shown under Profile → Mosque Applications.
 */
export default function MySuggestedMosques() {
  const [state, setState] = useState({ status: "loading", items: [], error: "" });

  useEffect(() => {
    const controller = new AbortController();
    apiRequest("/api/me/mosque-suggestions", { signal: controller.signal })
      .then(({ data }) => setState({ status: "done", items: data || [], error: "" }))
      .catch((error) => { if (error.name !== "AbortError") setState({ status: "error", items: [], error: error.message }); });
    return () => controller.abort();
  }, []);

  return (
    <section className="mt-4" aria-labelledby="my-mosque-suggestions">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
        <h3 id="my-mosque-suggestions" className="h6 fw-bold mb-0">Mosques I suggested</h3>
        <Link to="/mosques/suggest" className="btn btn-sm btn-outline-mc">Suggest a mosque</Link>
      </div>
      <SkeletonRegion label="Loading your suggestions…" loading={state.status === "loading"}><ListRowsSkeleton rows={1} /></SkeletonRegion>
      {state.status === "error" && <div className="alert alert-danger py-2 small" role="alert">{state.error}</div>}
      {state.status === "done" && state.items.length === 0 && <p className="text-muted small mb-0">You haven&apos;t suggested a mosque yet.</p>}
      {state.items.map((item) => (
        <div className="border rounded p-3 mb-2" key={item.id}>
          <div className="d-flex flex-wrap align-items-center gap-2">
            <strong className="me-auto">{item.name}</strong>
            <span className={`badge ${STATUS[item.status]?.[1] || "bg-secondary"}`}>{STATUS[item.status]?.[0] || item.status}</span>
          </div>
          <p className="small text-muted mb-0">{[item.area, item.district].filter(Boolean).join(", ") || item.address}</p>
          {item.review_note && <p className="small mb-0 mt-1">Reviewer: {item.review_note}</p>}
          {item.status === "approved" && item.mosque_id && <Link to={`/mosque-admin/claim?mosque=${item.mosque_id}`} className="small">Claim this mosque</Link>}
        </div>
      ))}
    </section>
  );
}
