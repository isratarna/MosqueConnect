import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchCampaigns } from "../../utils/campaignApi";
import CampaignCard from "./CampaignCard";

export default function MosqueCampaignsSection({ mosqueId }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetchCampaigns({ mosqueId, perPage: 3, signal: controller.signal })
      .then(({ campaigns: items }) => setCampaigns(items))
      .catch((error) => { if (error.name !== "AbortError") setCampaigns([]); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [mosqueId]);

  if (loading) return <p className="text-muted small" role="status">Loading donation campaigns...</p>;
  if (!campaigns.length) return null;

  return (
    <section className="mt-4" aria-labelledby="mosque-campaigns-heading">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 id="mosque-campaigns-heading" className="h5 fw-bold mb-0">Active donation campaigns</h2>
        <Link to={`/campaigns?mosque=${encodeURIComponent(mosqueId)}`} className="small text-mc">View all</Link>
      </div>
      <div className="mc-campaign-grid">{campaigns.map((campaign) => <CampaignCard key={campaign.id} campaign={campaign} />)}</div>
    </section>
  );
}
