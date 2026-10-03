import { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, Landmark, Phone, TriangleAlert, UsersRound } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import CampaignProgress from "../components/campaigns/CampaignProgress";
import CampaignStatusBadge from "../components/campaigns/CampaignStatusBadge";
import CampaignSupportAction from "../components/campaigns/CampaignSupportAction";
import { CampaignApiError, fetchCampaign } from "../utils/campaignApi";
import { formatCampaignDate, formatCampaignMoney } from "../utils/campaignFormat";
import { PageSkeleton } from "../components/skeletons";
import ReportButton from "../components/ReportButton";
import { campaignCategoryLabel } from "../utils/labels";
import { formatNumber } from "../utils/intl";
import { translate } from "../i18n/translate";
import { useLocale } from "../hooks/useLocale";

export default function CampaignDetails() {
  const { t, locale } = useLocale();
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
          setError(requestError instanceof CampaignApiError && requestError.status === 404 ? translate("campaign.details.notFound") : requestError.message);
        }
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id]);

  if (loading) return <PageSkeleton label={t("campaign.details.loading")} />;
  if (error || !campaign) return <CampaignDetailsState error={error || t("campaign.details.loadFailed")} />;

  return (
    <section className="mc-campaign-details mc-atmospheric-section">
      <div className="container py-5">
        <nav className="mb-3" aria-label={t("common.breadcrumb")}><Link to="/campaigns" className="text-mc text-decoration-none"><ArrowLeft size={16} /> {t("campaign.details.back")}</Link></nav>
        <div className="mc-campaign-details__layout mc-motion-stagger">
          <article className="mc-campaign-details__content mc-card">
            {campaign.image_url && <img src={campaign.image_url} alt="" className="mc-campaign-details__image" />}
            <div className="mc-campaign-card__meta"><span>{campaignCategoryLabel(t, campaign.category)}</span><CampaignStatusBadge status={campaign.status} /></div>
            <h1>{campaign.title}</h1>
            <div className="mb-3"><ReportButton type="campaign" id={campaign.id} /></div>
            <p className="mc-campaign-details__summary">{campaign.summary}</p>
            <CampaignProgress campaign={campaign} />
            <div className="mc-campaign-details__body">
              <h2>{t("campaign.details.about")}</h2>
              {campaign.description.split("\n").map((paragraph, index) => <p key={index}>{paragraph}</p>)}
            </div>
          </article>
          <aside className="mc-campaign-details__sidebar">
            <section className="mc-card">
              <h2>{t("campaign.details.info")}</h2>
              <dl>
                <Info icon={Landmark} label={t("campaign.details.organizedBy")} value={campaign.mosque?.name} />
                <Info icon={CalendarDays} label={t("campaign.details.dates")} value={`${formatCampaignDate(campaign.starts_on, locale, t("common.notSpecified"))} – ${formatCampaignDate(campaign.ends_on, locale, t("common.notSpecified"))}`} />
                <Info icon={UsersRound} label={t("campaign.details.contributions")} value={formatNumber(campaign.supporters_count ?? 0, locale)} />
                <Info icon={Phone} label={t("campaign.details.mosqueContact")} value={campaign.mosque?.phone || t("campaign.details.contactUnavailable")} />
              </dl>
              <CampaignSupportAction campaign={campaign} />
              <p className="mc-campaign-details__manual-note">{t("campaign.details.manualNote")}</p>
            </section>
            <section className="mc-card mc-campaign-details__goal">
              <span>{t("campaign.details.remaining")}</span>
              <strong>{formatCampaignMoney(campaign.remaining_amount, campaign.currency, locale)}</strong>
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
  const { t } = useLocale();

  return (
    <section className="mc-campaign-details mc-atmospheric-section"><div className="container py-5">
      <div className={`mc-campaign-state mc-card${error ? " is-error" : ""}`} role={error ? "alert" : "status"}>
        {error && <TriangleAlert size={38} />}<h1>{error ? t("campaign.details.unavailable") : message}</h1>{error && <p>{error}</p>}
        <Link to="/campaigns" className="btn btn-mc">{t("campaign.details.browseActive")}</Link>
      </div>
    </div></section>
  );
}
