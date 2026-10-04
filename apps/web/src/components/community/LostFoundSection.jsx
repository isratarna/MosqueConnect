import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import Pagination from "../Pagination";
import LostFoundCard from "./LostFoundCard";
import LostFoundForm from "./LostFoundForm";
import { fetchLostFound, hubLabelT, LOST_FOUND_CATEGORIES } from "../../utils/communityHubApi";
import { useLocale } from "../../hooks/useLocale";

/** The Community page's "Lost & Found" tab. */
export default function LostFoundSection() {
  const { t } = useLocale(); // [Urmee · i18n community]
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ type: "", category: "", status: "open" });
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ data: [], meta: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetchLostFound({ ...filters, page }, { signal: controller.signal })
      .then((data) => setResult({ data: data.data || [], meta: data.meta || null }))
      .catch((err) => { if (err.name !== "AbortError") setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [filters, page, attempt]);

  const setFilter = (key) => (event) => { setPage(1); setFilters((current) => ({ ...current, [key]: event.target.value })); };

  return (
    <section className="mc-community-section mc-motion-section" aria-labelledby="lost-found-heading">
      <div className="mc-community-section__heading">
        <div>
          <p className="mc-kicker">{t("lostFound.kicker")}</p>
          <h2 id="lost-found-heading">{t("lostFound.heading")}</h2>
        </div>
        {user ? (
          <button type="button" className="btn btn-mc" onClick={() => setFormOpen(true)}><Plus size={16} aria-hidden="true" /> {t("lostFound.report")}</button>
        ) : (
          <Link className="btn btn-outline-mc" to="/login" state={{ from: `${location.pathname}${location.search}` }}>{t("lostFound.signInToReport")}</Link>
        )}
      </div>

      <div className="row g-2 mb-3" aria-label={t("lostFound.filterLabel")}>
        <div className="col-sm-4">
          <select className="form-select" value={filters.type} onChange={setFilter("type")} aria-label={t("lostFound.lostOrFound")}>
            <option value="">{t("lostFound.both")}</option>
            <option value="lost">{t("lostFound.lostItems")}</option>
            <option value="found">{t("lostFound.foundItems")}</option>
          </select>
        </div>
        <div className="col-sm-4">
          <select className="form-select" value={filters.category} onChange={setFilter("category")} aria-label={t("lostFound.category")}>
            <option value="">{t("lostFound.allCategories")}</option>
            {LOST_FOUND_CATEGORIES.map(([value]) => <option key={value} value={value}>{hubLabelT(t, "lostFoundCategory", value)}</option>)}
          </select>
        </div>
        <div className="col-sm-4">
          <select className="form-select" value={filters.status} onChange={setFilter("status")} aria-label={t("lostFound.statusLabel")}>
            <option value="open">{t("lostFound.stillOpen")}</option>
            <option value="returned">{t("lostFound.returnedFilter")}</option>
            <option value="all">{t("lostFound.allStatuses")}</option>
          </select>
        </div>
      </div>

      {loading ? <p role="status">{t("lostFound.loading")}</p>
        : error ? <div className="alert alert-danger" role="alert">{error} <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setAttempt((n) => n + 1)}>{t("common.retry")}</button></div>
          : result.data.length ? (
            <>
              <div className="row g-3">
                {result.data.map((item) => <div className="col-sm-6 col-lg-4" key={item.id}><LostFoundCard item={item} /></div>)}
              </div>
              {result.meta?.last_page > 1 && <div className="mt-3"><Pagination currentPage={result.meta.current_page} totalPages={result.meta.last_page} onPageChange={setPage} /></div>}
            </>
          ) : (
            <div className="mc-community-empty mc-card text-center">
              <Search size={30} aria-hidden="true" />
              <h3>{t("lostFound.emptyTitle")}</h3>
              <p>{t("lostFound.emptyBody")}</p>
            </div>
          )}

      {formOpen && <LostFoundForm onClose={() => setFormOpen(false)} onCreated={(item) => navigate(`/community/lost-found/${item.id}`)} />}
    </section>
  );
}
