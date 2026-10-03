import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, CheckCircle2, MapPin, Phone, RotateCcw } from "lucide-react";
import { hubLabelT, LOST_FOUND_STATUS, fetchLostFoundItem, updateLostFoundStatus } from "../utils/communityHubApi";
import { useLocale } from "../hooks/useLocale";
import { formatApiDate } from "../utils/intl";
import { PageSkeleton } from "../components/skeletons";
import ReportButton from "../components/ReportButton";

export default function LostFoundDetails() {
  const { t, locale } = useLocale(); // [Urmee · i18n community]
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setItem(null);
    setError("");
    fetchLostFoundItem(id, { signal: controller.signal })
      .then((data) => setItem(data.data))
      .catch((err) => { if (err.name !== "AbortError") setError(err.status === 404 ? t("lostFound.notFound") : err.message); });
    return () => controller.abort();
  }, [id]);

  async function setStatus(status) {
    setBusy(true);
    setError("");
    try {
      const data = await updateLostFoundStatus(item.id, status);
      setItem(data.data);
      setMessage(status === "returned" ? t("lostFound.markedReturned") : t("lostFound.openAgain"));
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  const back = <Link to="/community?category=lost_found" className="btn btn-link text-mc px-0 mb-3"><ArrowLeft size={16} aria-hidden="true" /> {t("lostFound.back")}</Link>;

  if (!item) {
    return (
      <div className="container py-5" style={{ minHeight: "60vh" }}>
        {back}
        {error ? <div className="alert alert-danger" role="alert">{error}</div> : <PageSkeleton label={t("lostFound.loadingItem")} />}
      </div>
    );
  }

  const statusClass = (LOST_FOUND_STATUS[item.status] || [])[1] || "bg-secondary";

  return (
    <div className="container py-4" style={{ minHeight: "70vh" }}>
      {back}
      <div className="row g-4">
        {item.photo_url && (
          <div className="col-lg-5">
            <img src={item.photo_url} alt={item.title} className="img-fluid rounded shadow-sm w-100 mc-lost-found-detail__photo" />
          </div>
        )}
        <div className={item.photo_url ? "col-lg-7" : "col-lg-8"}>
          <div className="card mc-card">
            <div className="card-body p-4">
              <div className="d-flex flex-wrap gap-2 mb-2">
                <span className={`badge ${item.type === "lost" ? "bg-danger" : "bg-success"}`}>{hubLabelT(t, "type", item.type)}</span>
                <span className="badge bg-light text-dark border">{hubLabelT(t, "lostFoundCategory", item.category)}</span>
                <span className={`badge ${statusClass}`}>{hubLabelT(t, "lostFoundStatus", item.status)}</span>
              </div>
              <h1 className="h3 fw-bold">{item.title}</h1>
              <div className="mb-2"><ReportButton type="lost_found" id={item.id} /></div>
              <p className="text-muted" style={{ whiteSpace: "pre-line" }}>{item.description}</p>
              <ul className="list-unstyled small mb-3">
                <li className="mb-1"><CalendarDays size={15} className="text-mc me-2" aria-hidden="true" />{t(item.type === "lost" ? "lostFound.lostOn" : "lostFound.foundOn", { date: formatApiDate(item.occurred_on, locale) })}</li>
                {item.mosque && <li className="mb-1"><MapPin size={15} className="text-mc me-2" aria-hidden="true" /><Link to={`/mosque/${item.mosque.id}`}>{item.mosque.name}</Link>{item.location_note && ` · ${item.location_note}`}</li>}
                {!item.mosque && item.location_note && <li className="mb-1"><MapPin size={15} className="text-mc me-2" aria-hidden="true" />{item.location_note}</li>}
                {item.contact_phone && <li className="mb-1"><Phone size={15} className="text-mc me-2" aria-hidden="true" /><a href={`tel:${item.contact_phone}`}>{item.contact_phone}</a></li>}
              </ul>
              {item.poster && <p className="small text-muted mb-3">{t("lostFound.postedBy", { name: item.poster.name })}</p>}
              {message && <div className="alert alert-success py-2" role="status">{message}</div>}
              {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}
              {item.is_owner && (
                item.status === "open" ? (
                  <button type="button" className="btn btn-mc" disabled={busy} onClick={() => setStatus("returned")}><CheckCircle2 size={16} aria-hidden="true" /> {t("lostFound.markReturned")}</button>
                ) : (
                  <button type="button" className="btn btn-outline-mc" disabled={busy} onClick={() => setStatus("open")}><RotateCcw size={16} aria-hidden="true" /> {t("lostFound.reopen")}</button>
                )
              )}
              {!item.is_owner && item.status === "open" && (
                <p className="small text-muted mb-0">{item.type === "found" ? t("lostFound.helpFound") : t("lostFound.helpLost")} {t("lostFound.autoClose")}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
