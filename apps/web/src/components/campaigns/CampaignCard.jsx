import { CalendarDays, Landmark } from "lucide-react";
import { Link } from "react-router-dom";
import { formatCampaignDate } from "../../utils/campaignFormat";
import CampaignProgress from "./CampaignProgress";
import CampaignStatusBadge from "./CampaignStatusBadge";

export default function CampaignCard({ campaign }) {
  return (
    <article className="mc-campaign-card mc-card">
      {campaign.image_url && <img src={campaign.image_url} alt="" className="mc-campaign-card__image" />}
      <div className="mc-campaign-card__body">
        <div className="mc-campaign-card__meta">
          <span>{campaign.category}</span>
          <CampaignStatusBadge status={campaign.status} />
        </div>
        <h2><Link to={`/campaigns/${campaign.id}`}>{campaign.title}</Link></h2>
        <p>{campaign.summary}</p>
        <div className="mc-campaign-card__facts">
          <span><Landmark size={15} aria-hidden="true" /> {campaign.mosque?.name}</span>
          <span><CalendarDays size={15} aria-hidden="true" /> Ends {formatCampaignDate(campaign.ends_on)}</span>
        </div>
        <CampaignProgress campaign={campaign} />
        <Link className="btn btn-mc w-100" to={`/campaigns/${campaign.id}`}>View and support</Link>
      </div>
    </article>
  );
}
