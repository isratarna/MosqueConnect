import { useTranslation } from "react-i18next";
import { statusLabel } from "../../utils/labels";

export default function CampaignStatusBadge({ status }) {
  const { t } = useTranslation();

  return <span className={`mc-campaign-status is-${status || "draft"}`}>{statusLabel(t, status)}</span>;
}
