import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Star } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../utils/api";
import ConfirmDialog from "../ConfirmDialog";
import ReportButton from "../ReportButton";
import { ListRowsSkeleton, SkeletonRegion } from "../skeletons";
import { Stars, StarInput } from "./Stars";

const PAGE_SIZE = 5;
const formatDate = (value) => (value ? new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "");

/**
 * Ratings and reviews. Everyone sees the list ("Load more" pages through it); a logged-in user can
 * rate 1–5 with an optional comment once, then edit or delete it (PUT/DELETE …/reviews/me).
 * `onChanged` lets the page refresh the average rating after a save or delete.
 */
export default function ReviewsSection({ mosque, onChanged }) {
  const { user } = useAuth();
  const location = useLocation();
  const [reviews, setReviews] = useState([]);
  const [page, setPage] = useState({ current: 0, last: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);

  // [Urmee · F3 Part 2] The API has no "my review" endpoint, so we find it in the loaded list by
  // user_id.
  const mine = user ? reviews.find((review) => review.user_id === user.id) : null;

  const load = useCallback(async (pageNumber, { replace = false, signal } = {}) => {
    setLoading(true);
    setError("");
    try {
      const response = await apiRequest(`/api/mosques/${mosque.id}/reviews?per_page=${PAGE_SIZE}&page=${pageNumber}`, { signal });
      setReviews((current) => (replace ? response.data : [...current, ...response.data]));
      setPage({ current: response.meta?.current_page ?? pageNumber, last: response.meta?.last_page ?? 1 });
    } catch (requestError) {
      if (requestError.name !== "AbortError") setError(requestError.message);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [mosque.id]);

  useEffect(() => {
    const controller = new AbortController();
    load(1, { replace: true, signal: controller.signal });
    return () => controller.abort();
  }, [load]);

  const startEdit = () => {
    setRating(mine?.rating ?? 0);
    setComment(mine?.comment ?? "");
    setEditing(true);
  };

  // [Urmee · F3 Part 2] PUT …/reviews/me creates or updates the one review a user can have per mosque;
  // then reload page 1 and refresh the average.
  const save = async (event) => {
    event.preventDefault();
    if (!rating) {
      setError("Choose a star rating first.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await apiRequest(`/api/mosques/${mosque.id}/reviews/me`, { method: "PUT", body: { rating, comment: comment.trim() || null } });
      setNotice("Your review has been saved.");
      setEditing(false);
      await load(1, { replace: true });
      onChanged?.();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    await apiRequest(`/api/mosques/${mosque.id}/reviews/me`, { method: "DELETE" });
    setNotice("Your review has been removed.");
    setRating(0);
    setComment("");
    await load(1, { replace: true });
    onChanged?.();
  };

  const showForm = user && (!mine || editing);

  return (
    <div className="card mc-card mb-4" id="reviews">
      <div className="card-body">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
          <h2 className="h5 fw-bold mb-0"><Star size={18} className="text-mc me-2" aria-hidden="true" />Reviews</h2>
          {mosque.rating !== null && (
            <span className="d-inline-flex align-items-center gap-2">
              <Stars value={mosque.rating} />
              <strong>{mosque.rating.toFixed(1)}</strong>
              <span className="text-muted small">({mosque.reviews_count} review{mosque.reviews_count === 1 ? "" : "s"})</span>
            </span>
          )}
        </div>

        {notice && <div className="alert alert-success py-2 small" role="status">{notice}</div>}
        {error && <div className="alert alert-danger py-2 small" role="alert">{error}</div>}

        {!user && <p className="small text-muted"><Link to="/login" state={{ from: location.pathname }}>Log in</Link> to rate this mosque.</p>}

        {showForm && (
          <form onSubmit={save} className="mb-4">
            <StarInput id={`rate-${mosque.id}`} value={rating} onChange={setRating} legend={mine ? "Edit your rating" : "Rate this mosque"} />
            <label className="form-label small mt-2" htmlFor={`review-comment-${mosque.id}`}>Comment (optional)</label>
            <textarea id={`review-comment-${mosque.id}`} className="form-control" rows="3" maxLength={1000} value={comment} onChange={(event) => setComment(event.target.value)} />
            <div className="d-flex gap-2 mt-2">
              <button type="submit" className="btn btn-mc btn-sm" disabled={saving}>{saving ? "Saving…" : mine ? "Update review" : "Submit review"}</button>
              {editing && <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setEditing(false)}>Cancel</button>}
            </div>
          </form>
        )}

        {mine && !editing && (
          <div className="alert alert-light border small d-flex flex-wrap align-items-center justify-content-between gap-2">
            <span>You rated this mosque <strong>{mine.rating}/5</strong>.</span>
            <span className="d-flex gap-2">
              <button type="button" className="btn btn-sm btn-outline-mc" onClick={startEdit}>Edit</button>
              <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setConfirmDelete(true)}>Delete</button>
            </span>
          </div>
        )}

        <SkeletonRegion label="Loading reviews…" loading={loading && reviews.length === 0}><ListRowsSkeleton rows={2} /></SkeletonRegion>
        {!loading && reviews.length === 0 && !error && <p className="text-muted mb-0">No reviews yet. Be the first to share how it was.</p>}

        <ul className="list-unstyled mb-0">
          {reviews.map((review) => (
            <li key={review.id} className="border-top pt-3 mt-3">
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                <span className="d-inline-flex align-items-center gap-2"><Stars value={review.rating} size={14} /><strong className="small">{review.user?.name || "A community member"}</strong></span>
                <small className="text-muted">{formatDate(review.created_at)}</small>
              </div>
              {review.comment && <p className="mb-1 mt-1 mc-prewrap">{review.comment}</p>}
              {/* [Urmee · F3 Part 2] Each review has a Report link (reportable_type "review"); you can't report your own. */}
              {review.user_id !== user?.id && <ReportButton type="review" id={review.id} className="btn btn-link btn-sm p-0 text-muted text-decoration-none d-inline-flex align-items-center gap-1" />}
            </li>
          ))}
        </ul>

        {page.current < page.last && (
          <div className="text-center mt-3">
            <button type="button" className="btn btn-outline-mc btn-sm" onClick={() => load(page.current + 1)} disabled={loading}>{loading ? "Loading…" : "Load more reviews"}</button>
          </div>
        )}
      </div>
      {confirmDelete && <ConfirmDialog title="Delete your review?" message="This removes your rating from the average." confirmLabel="Delete review" tone="danger" onConfirm={remove} onClose={() => setConfirmDelete(false)} />}
    </div>
  );
}
