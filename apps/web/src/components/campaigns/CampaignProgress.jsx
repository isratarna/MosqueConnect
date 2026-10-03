import { clampCampaignProgress, formatCampaignMoney } from "../../utils/campaignFormat";
import { formatPercent } from "../../utils/intl";
import { useLocale } from "../../hooks/useLocale";

export default function CampaignProgress({ campaign, compact = false }) {
  const { t, locale } = useLocale();
  const percentage = clampCampaignProgress(campaign.progress_percentage);
  return (
    <div className={`mc-campaign-progress${compact ? " is-compact" : ""}`}>
      <div className="mc-campaign-progress__track" role="progressbar" aria-label={t("campaign.fundingProgress", { title: campaign.title })} aria-valuenow={percentage} aria-valuemin="0" aria-valuemax="100">
        <span style={{ width: `${percentage}%` }} />
      </div>
      <div className="mc-campaign-progress__figures">
        <span><strong>{formatCampaignMoney(campaign.raised_amount, campaign.currency, locale)}</strong> {t("campaign.raised")}</span>
        <span>{formatPercent(percentage, locale)}</span>
      </div>
      {!compact && <p>{t("campaign.goal", { amount: formatCampaignMoney(campaign.target_amount, campaign.currency, locale) })}</p>}
    </div>
  );
}
