import { useEffect, useState } from "react";
import { Bot, Check, Download, FileText, TriangleAlert, X } from "lucide-react";
import Modal from "../Modal";
import ConfirmDialog from "../ConfirmDialog";
import { aiReview, previewKind } from "../../utils/adminConsole";
import { downloadClaimDocument, fetchClaim, fetchClaimDocumentBlob, reviewClaim } from "../../utils/systemAdminApi";

const dateTime = (value) => value ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
const labelize = (value = "") => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const ACTIONS = {
  approve: {
    title: "Approve this claim?",
    message: "The applicant becomes the mosque's owner and the mosque is marked verified.",
    confirmLabel: "Approve claim",
    tone: "success",
    reason: "optional",
    reasonLabel: "Approval note",
  },
  reject: {
    title: "Reject this claim?",
    message: "The applicant will see the claim as rejected.",
    confirmLabel: "Reject claim",
    tone: "danger",
    reason: "required",
    reasonLabel: "Rejection reason",
  },
  "request-information": {
    title: "Ask for more information",
    message: "The claim stays open while the applicant responds.",
    confirmLabel: "Send request",
    tone: "primary",
    reason: "required",
    reasonLabel: "What is needed",
  },
};

/** One claim, reviewed in place: proof, automated advice, competing claims and the decision. */
export default function ClaimReviewPanel({ claimId, onClose, onChanged }) {
  const [detail, setDetail] = useState(null);
  const [competing, setCompeting] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [doc, setDoc] = useState(null);
  const [docError, setDocError] = useState("");
  const [action, setAction] = useState(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoadError("");
    fetchClaim(claimId, { signal: controller.signal })
      .then((payload) => { setDetail(payload.data); setCompeting(payload.competing_claims || []); })
      .catch((error) => { if (error.name !== "AbortError") setLoadError(error.message); });
    return () => controller.abort();
  }, [claimId, revision]);

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl = null;
    setDoc(null);
    setDocError("");
    fetchClaimDocumentBlob(claimId, { signal: controller.signal })
      .then((loaded) => { objectUrl = loaded.url; setDoc(loaded); })
      .catch((error) => { if (error.name !== "AbortError") setDocError(error.message); });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [claimId]);

  const finalized = ["approved", "rejected"].includes(detail?.status);
  const review = aiReview(detail);
  const kind = doc ? previewKind(doc.mimeType) : null;

  return (
    <>
      <Modal title={detail ? `Claim #${detail.id} · ${detail.mosque?.name || "Mosque"}` : "Mosque claim"} onClose={onClose} size="modal-xl">
        {loadError && <div className="alert alert-danger">{loadError}</div>}
        {!detail && !loadError && <div className="py-5 text-center text-muted"><span className="spinner-border spinner-border-sm me-2" />Loading claim…</div>}
        {detail && (
          <div className="row g-4">
            <div className="col-lg-7">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h3 className="h6 fw-bold mb-0 d-flex align-items-center gap-2"><FileText size={16} aria-hidden="true" />Proof document</h3>
                <button type="button" className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1" onClick={() => downloadClaimDocument(detail.id).catch((error) => setDocError(error.message))}>
                  <Download size={14} aria-hidden="true" />Download
                </button>
              </div>
              {docError && <div className="alert alert-warning small">{docError}</div>}
              {!doc && !docError && <div className="mc-doc-viewer d-flex align-items-center justify-content-center text-muted"><span className="spinner-border spinner-border-sm me-2" />Loading document…</div>}
              {doc && kind === "pdf" && <iframe className="mc-doc-viewer" src={doc.url} title={`Proof document for claim ${detail.id}`} />}
              {doc && kind === "image" && <img className="mc-doc-viewer-image" src={doc.url} alt={`Proof document for claim ${detail.id}`} />}
              {doc && !kind && <div className="alert alert-secondary small">This file type cannot be previewed. Use Download to open it.</div>}
            </div>

            <div className="col-lg-5">
              <section className="mb-4">
                <h3 className="h6 fw-bold">Applicant</h3>
                <div><strong>{detail.user?.name}</strong> <span className="text-muted small">· {detail.user?.phone}</span></div>
                <div className="small"><span className="text-muted">Stated role:</span> {detail.role_at_mosque || "—"}</div>
                {detail.verification_reason && <p className="small mb-1"><span className="text-muted">Reason:</span> {detail.verification_reason}</p>}
                <div className="small text-muted">Submitted {dateTime(detail.submitted_at)} · Status <strong>{labelize(detail.status)}</strong></div>
                {detail.review_note && <div className="small mt-1"><span className="text-muted">Last note:</span> {detail.review_note}</div>}
                <div className="small text-muted mt-1">{detail.mosque?.address}</div>
              </section>

              <section className="mb-4 border rounded p-3 bg-light-subtle" aria-labelledby={`ai-${detail.id}`}>
                <h3 id={`ai-${detail.id}`} className="h6 fw-bold d-flex align-items-center gap-2 mb-2"><Bot size={16} aria-hidden="true" />Automated pre-screen <span className="badge bg-secondary-subtle text-secondary-emphasis fw-normal">advice only</span></h3>
                {review.state === "none" && <p className="small text-muted mb-0">Not checked yet. Pre-screening runs automatically for new claims when it is switched on.</p>}
                {review.state === "error" && <p className="small text-muted mb-0">The automated check could not run: {review.message} Review the document by hand.</p>}
                {review.state === "done" && (
                  <>
                    {review.badge && <div className="mb-2"><span className={`badge bg-${review.badge.tone}`}>{review.badge.percent}% · {review.badge.label}</span> <span className="small text-muted">Looks like: {labelize(review.documentType)}</span></div>}
                    <p className="small mb-2">{review.summary}</p>
                    <div className="small mb-2">
                      <span className={review.mentionsMosque ? "text-success" : "text-danger"}>{review.mentionsMosque ? "✓" : "✗"} Mosque name</span>
                      <span className="mx-2 text-muted">·</span>
                      <span className={review.mentionsApplicant ? "text-success" : "text-danger"}>{review.mentionsApplicant ? "✓" : "✗"} Applicant name</span>
                    </div>
                    {review.redFlags.length > 0 && (
                      <ul className="small text-danger ps-3 mb-2">{review.redFlags.map((flag) => <li key={flag}><TriangleAlert size={12} className="me-1" aria-hidden="true" />{flag}</li>)}</ul>
                    )}
                    {review.findings.length > 0 && <ul className="small text-muted ps-3 mb-0">{review.findings.map((finding) => <li key={finding}>{finding}</li>)}</ul>}
                  </>
                )}
              </section>

              <section className="mb-4">
                <h3 className="h6 fw-bold">Other claims for this mosque</h3>
                {competing.length === 0 ? <p className="small text-muted mb-0">None.</p> : (
                  <ul className="list-unstyled small mb-0">
                    {competing.map((other) => (
                      <li key={other.id} className="border-bottom py-1 d-flex justify-content-between gap-2">
                        <span><strong>{other.user?.name}</strong> · {other.role_at_mosque || "—"}</span>
                        <span className="text-muted text-nowrap">{labelize(other.status)}{other.ai_score != null && ` · ${Math.round(other.ai_score * 100)}%`}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {(detail.applicant_claims || []).length > 1 && (
                <section className="mb-4">
                  <h3 className="h6 fw-bold">This applicant's other claims</h3>
                  <ul className="list-unstyled small mb-0">
                    {detail.applicant_claims.filter((other) => other.id !== detail.id).map((other) => (
                      <li key={other.id} className="d-flex justify-content-between"><span>{other.mosque?.name}</span><span className="text-muted">{labelize(other.status)}</span></li>
                    ))}
                  </ul>
                </section>
              )}

              {!finalized && (
                <div className="d-flex flex-wrap gap-2 border-top pt-3">
                  <button type="button" className="btn btn-success d-flex align-items-center gap-1" onClick={() => setAction("approve")}><Check size={16} aria-hidden="true" />Approve</button>
                  <button type="button" className="btn btn-outline-danger d-flex align-items-center gap-1" onClick={() => setAction("reject")}><X size={16} aria-hidden="true" />Reject</button>
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setAction("request-information")}>More info</button>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {action && (
        <ConfirmDialog
          {...ACTIONS[action]}
          onClose={() => setAction(null)}
          onConfirm={async (note) => {
            await reviewClaim(detail.id, action, note);
            setRevision((value) => value + 1);
            onChanged?.();
          }}
        />
      )}
    </>
  );
}
