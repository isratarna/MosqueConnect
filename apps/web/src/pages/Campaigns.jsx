import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, TriangleAlert } from "lucide-react";
import CampaignCard from "../components/campaigns/CampaignCard";
import Pagination from "../components/Pagination";
import { CAMPAIGN_CATEGORIES, fetchCampaigns } from "../utils/campaignApi";

export default function Campaigns() {
  const [searchParams] = useSearchParams();
  const mosqueId = searchParams.get("mosque") || "";
  const [campaigns, setCampaigns] = useState([]);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
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
        if (requestError.name !== "AbortError") setError(requestError.message || "Campaigns could not be loaded.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query, category, mosqueId, page]);

  const applySearch = (event) => { event.preventDefault(); setPage(1); setQuery(search.trim()); };

  return (
    <section className="mc-campaigns-page mc-atmospheric-section">
      <div className="container py-5">
        <header className="mc-campaigns-page__intro mc-motion-section">
          <p className="mc-kicker">Give with confidence</p>
          <h1>Active donation campaigns</h1>
          <p>Support verified mosques and follow each campaign&apos;s confirmed progress.</p>
        </header>

        <div className="mc-campaign-filters mc-card">
          <form onSubmit={applySearch} className="mc-campaign-filters__search">
            <label className="visually-hidden" htmlFor="campaign-search">Search campaigns</label>
            <Search size={18} aria-hidden="true" />
            <input id="campaign-search" className="form-control" placeholder="Search campaigns or mosques" value={search} onChange={(event) => setSearch(event.target.value)} />
            <button className="btn btn-mc" type="submit">Search</button>
          </form>
          <label className="visually-hidden" htmlFor="campaign-category">Campaign category</label>
          <select id="campaign-category" className="form-select" value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }}>
            <option value="">All categories</option>
            {CAMPAIGN_CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>

        {loading && <div className="mc-campaign-state" role="status">Loading active campaigns...</div>}
        {error && <div className="mc-campaign-state is-error" role="alert"><TriangleAlert size={28} /> {error}</div>}
        {!loading && !error && campaigns.length === 0 && <div className="mc-campaign-state">No active campaigns match your search.</div>}
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
