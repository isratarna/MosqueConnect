import { clampCampaignProgress, formatCampaignMoney } from "../../utils/campaignFormat";

export default function CampaignProgress({ campaign, compact = false }) {
  const percentage = clampCampaignProgress(campaign.progress_percentage);
  return (
    <div className={`mc-campaign-progress${compact ? " is-compact" : ""}`}>
      <div className="mc-campaign-progress__track" role="progressbar" aria-label={`${campaign.title} funding progress`} aria-valuenow={percentage} aria-valuemin="0" aria-valuemax="100">
        <span style={{ width: `${percentage}%` }} />
      </div>
      <div className="mc-campaign-progress__figures">
        <span><strong>{formatCampaignMoney(campaign.raised_amount, campaign.currency)}</strong> raised</span>
        <span>{percentage.toFixed(0)}%</span>
      </div>
      {!compact && <p>Goal: {formatCampaignMoney(campaign.target_amount, campaign.currency)}</p>}
    </div>
  );
}
