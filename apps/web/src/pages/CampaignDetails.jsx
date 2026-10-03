import { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, Landmark, Phone, TriangleAlert, UsersRound } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import CampaignProgress from "../components/campaigns/CampaignProgress";
import CampaignStatusBadge from "../components/campaigns/CampaignStatusBadge";
import CampaignSupportAction from "../components/campaigns/CampaignSupportAction";
import { CampaignApiError, fetchCampaign } from "../utils/campaignApi";
import { formatCampaignDate, formatCampaignMoney } from "../utils/campaignFormat";

export default function CampaignDetails() {
  const { id } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetchCampaign(id, { signal: controller.signal })
      .then(setCampaign)
      .catch((requestError) => {
        if (requestError.name !== "AbortError") {
          setError(requestError instanceof CampaignApiError && requestError.status === 404 ? "This campaign is no longer active or available." : requestError.message);
        }
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id]);

  if (loading) return <CampaignDetailsState message="Loading campaign details..." />;
  if (error || !campaign) return <CampaignDetailsState error={error || "Campaign details could not be loaded."} />;

  return (
    <section className="mc-campaign-details mc-atmospheric-section">
      <div className="container py-5">
        <nav className="mb-3" aria-label="breadcrumb"><Link to="/campaigns" className="text-mc text-decoration-none"><ArrowLeft size={16} /> Active campaigns</Link></nav>
        <div className="mc-campaign-details__layout mc-motion-stagger">
          <article className="mc-campaign-details__content mc-card">
            {campaign.image_url && <img src={campaign.image_url} alt="" className="mc-campaign-details__image" />}
            <div className="mc-campaign-card__meta"><span>{campaign.category}</span><CampaignStatusBadge status={campaign.status} /></div>
            <h1>{campaign.title}</h1>
            <p className="mc-campaign-details__summary">{campaign.summary}</p>
            <CampaignProgress campaign={campaign} />
            <div className="mc-campaign-details__body">
              <h2>About this campaign</h2>
              {campaign.description.split("\n").map((paragraph, index) => <p key={index}>{paragraph}</p>)}
            </div>
          </article>
          <aside className="mc-campaign-details__sidebar">
            <section className="mc-card">
              <h2>Campaign information</h2>
              <dl>
                <Info icon={Landmark} label="Organized by" value={campaign.mosque?.name} />
                <Info icon={CalendarDays} label="Campaign dates" value={`${formatCampaignDate(campaign.starts_on)} – ${formatCampaignDate(campaign.ends_on)}`} />
                <Info icon={UsersRound} label="Confirmed contributions" value={campaign.supporters_count ?? 0} />
                <Info icon={Phone} label="Mosque contact" value={campaign.mosque?.phone || "Contact details unavailable"} />
              </dl>
              <CampaignSupportAction campaign={campaign} />
              <p className="mc-campaign-details__manual-note">Manual support only. MosqueConnect does not process payment information.</p>
            </section>
            <section className="mc-card mc-campaign-details__goal">
              <span>Remaining to goal</span>
              <strong>{formatCampaignMoney(campaign.remaining_amount, campaign.currency)}</strong>
            </section>
          </aside>
        </div>
      </div>
    </section>
  );
}

function Info({ icon: Icon, label, value }) {
  return <div><dt><Icon size={15} aria-hidden="true" /> {label}</dt><dd>{value}</dd></div>;
}

function CampaignDetailsState({ message, error }) {
  return (
    <section className="mc-campaign-details mc-atmospheric-section"><div className="container py-5">
      <div className={`mc-campaign-state mc-card${error ? " is-error" : ""}`} role={error ? "alert" : "status"}>
        {error && <TriangleAlert size={38} />}<h1>{error ? "Campaign unavailable" : message}</h1>{error && <p>{error}</p>}
        <Link to="/campaigns" className="btn btn-mc">Browse active campaigns</Link>
      </div>
    </div></section>
  );
}
