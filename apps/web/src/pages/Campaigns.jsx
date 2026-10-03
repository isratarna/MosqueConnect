import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, TriangleAlert } from "lucide-react";
import CampaignCard from "../components/campaigns/CampaignCard";
import Pagination from "../components/Pagination";
import { CAMPAIGN_CATEGORIES, fetchCampaigns } from "../utils/campaignApi";
import { CampaignCardSkeleton, SkeletonRegion } from "../components/skeletons";
import { campaignCategoryLabel } from "../utils/labels";
import { translate } from "../i18n/translate";
import { useLocale } from "../hooks/useLocale";

export default function Campaigns() {
  const { t } = useLocale();
  const [searchParams] = useSearchParams();
  const mosqueId = searchParams.get("mosque") || "";
  const [campaigns, setCampaigns] = useState([]);
  const initialSearch = searchParams.get("search") || "";
  const [search, setSearch] = useState(initialSearch);
  const [query, setQuery] = useState(initialSearch);
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetchCampaigns({ signal: controller.signal, search: query, category, mosqueId, page })
      .then(({ campaigns: items, meta: pagination }) => { setCampaigns(items); setMeta(pagination); })
      .catch((requestError) => {
        if (requestError.name !== "AbortError") setError(requestError.message || translate("campaign.loadError"));
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query, category, mosqueId, page]);

  const applySearch = (event) => { event.preventDefault(); setPage(1); setQuery(search.trim()); };

  return (
    <section className="mc-campaigns-page mc-atmospheric-section">
      <div className="container py-5">
        <header className="mc-campaigns-page__intro mc-motion-section">
          <p className="mc-kicker">{t("campaign.kicker")}</p>
          <h1>{t("campaign.title")}</h1>
          <p>{t("campaign.copy")}</p>
        </header>

        <div className="mc-campaign-filters mc-card">
          <form onSubmit={applySearch} className="mc-campaign-filters__search">
            <label className="visually-hidden" htmlFor="campaign-search">{t("campaign.searchLabel")}</label>
            <Search size={18} aria-hidden="true" />
            <input id="campaign-search" className="form-control" placeholder={t("campaign.searchPlaceholder")} value={search} onChange={(event) => setSearch(event.target.value)} />
            <button className="btn btn-mc" type="submit">{t("common.search")}</button>
          </form>
          <label className="visually-hidden" htmlFor="campaign-category">{t("campaign.categoryLabel")}</label>
          <select id="campaign-category" className="form-select" value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }}>
            <option value="">{t("campaign.allCategories")}</option>
            {CAMPAIGN_CATEGORIES.map((item) => <option key={item} value={item}>{campaignCategoryLabel(t, item)}</option>)}
          </select>
        </div>

        <SkeletonRegion label={t("campaign.loading")} loading={loading}>
          <div className="mc-campaign-grid">{Array.from({ length: 6 }, (_, index) => <CampaignCardSkeleton key={index} />)}</div>
        </SkeletonRegion>
        {error && <div className="mc-campaign-state is-error" role="alert"><TriangleAlert size={28} /> {error}</div>}
        {!loading && !error && campaigns.length === 0 && <div className="mc-campaign-state">{t("campaign.noMatch")}</div>}
        {!loading && !error && campaigns.length > 0 && (
          <>
            <div className="mc-campaign-grid mc-motion-stagger">
              {campaigns.map((campaign) => <CampaignCard key={campaign.id} campaign={campaign} />)}
            </div>
            {meta?.last_page > 1 && <Pagination currentPage={meta.current_page} totalPages={meta.last_page} onPageChange={setPage} />}
          </>
        )}
      </div>
    </section>
  );
}
