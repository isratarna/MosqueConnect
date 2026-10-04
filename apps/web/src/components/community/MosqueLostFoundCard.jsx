import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PackageSearch, Plus } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import LostFoundForm from "./LostFoundForm";
import { fetchLostFound, hubLabelT } from "../../utils/communityHubApi";
import { useLocale } from "../../hooks/useLocale";

/** Mosque profile card: the latest three open lost & found items at this mosque. */
export default function MosqueLostFoundCard({ mosque }) {
  const { t } = useLocale(); // [Urmee · i18n community]
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetchLostFound({ mosque_id: mosque.id, per_page: 3 }, { signal: controller.signal })
      .then((data) => { setItems(data.data || []); setTotal(data.meta?.total || 0); })
      .catch(() => {});
    return () => controller.abort();
  }, [mosque.id, revision]);

  return (
    <div className="card mc-card mb-4">
      <div className="card-body">
        <h6 className="fw-bold mb-3"><PackageSearch size={18} className="text-mc me-2" aria-hidden="true" />{t("lostFound.cardTitle")}</h6>
        {items.length ? (
          <ul className="list-unstyled small mb-2">
            {items.map((item) => (
              <li key={item.id} className="mb-2 d-flex gap-2 align-items-start">
                <span className={`badge ${item.type === "lost" ? "bg-danger" : "bg-success"}`}>{hubLabelT(t, "type", item.type)}</span>
                <span className="min-w-0"><Link to={`/community/lost-found/${item.id}`} className="text-decoration-none">{item.title}</Link><span className="d-block text-muted">{item.occurred_on}</span></span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted small mb-2">{t("lostFound.cardEmpty")}</p>
        )}
        <div className="d-flex flex-wrap gap-2 align-items-center">
          {user && <button type="button" className="btn btn-sm btn-outline-mc" onClick={() => setFormOpen(true)}><Plus size={14} aria-hidden="true" /> {t("lostFound.reportItem")}</button>}
          <Link to="/community?category=lost_found" className="small text-mc">{total > 3 ? t("lostFound.seeAll", { count: total }) : t("lostFound.openLostFound")}</Link>
        </div>
      </div>
      {formOpen && <LostFoundForm mosque={mosque} onClose={() => setFormOpen(false)} onCreated={() => { setFormOpen(false); setRevision((n) => n + 1); }} />}
    </div>
  );
}
