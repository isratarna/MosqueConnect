import { useEffect, useState } from "react";
import { Bell, Check, CheckCircle2, Circle, Inbox, PackageOpen, PencilLine, X } from "lucide-react";
import DashboardCard from "./DashboardCard";
import { reviewPledge } from "../../../utils/dashboardApi";
import { formatCampaignMoney } from "../../../utils/campaignFormat";
import { formatShortDate } from "../../../utils/dashboardFormat";
import { can, canUseSection } from "../../../utils/teamRoles";
import { useLocale } from "../../../hooks/useLocale";

/**
 * Pending pledges to confirm, open reports and the profile checklist. Each
 * part comes from its own dashboard key, so one failing part leaves the others.
 */
export default function AttentionCard({ data, abilities = [], loading, error: loadError, failed, onRetry, onReviewed, onNavigate }) {
  const { t, locale } = useLocale();
  const money = (pledge) => formatCampaignMoney(pledge.amount, pledge.currency || "BDT", locale);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");
  const [handled, setHandled] = useState({});
  // Fresh dashboard data no longer lists reviewed pledges, so stop hiding them locally.
  useEffect(() => setHandled({}), [data]);
  const pledges = (data?.pending_pledges || []).filter((pledge) => !handled[pledge.id]);
  const reports = data?.pending_content_reports || [];
  const completeness = data?.profile_completeness;
  const pledgeCount = Math.max(0, (data?.summary?.pending_pledges_count ?? pledges.length) - Object.keys(handled).length);

  const review = async (pledge, action) => {
    if (busy) return;
    setBusy(`${pledge.id}-${action}`);
    setError("");
    try {
      await reviewPledge(data.mosque.id, pledge, action);
      setHandled((current) => ({ ...current, [pledge.id]: action }));
      onReviewed?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  };

  // Each part shows only to roles that can act on it.
  const content = can(abilities, "content");
  const settings = can(abilities, "settings");
  const corrections = canUseSection(abilities, "corrections");
  const suggestionCount = data?.summary?.pending_suggestions_count || 0;
  const complaintCount = data?.summary?.open_complaints_count || 0;
  const goodsCount = data?.summary?.pending_goods_donations_count || 0;

  return (
    <DashboardCard title={t("dashboard.attention.title")} icon={Bell} loading={loading} error={loadError} onRetry={onRetry} skeletonLines={6}>
      {corrections && (
        <>
          <h3 className="mc-dash-subhead">{t("dashboard.attention.corrections")} {suggestionCount > 0 && <span className="badge bg-warning text-dark">{suggestionCount}</span>}</h3>
          {failed.includes("pending_suggestions") ? (
            <SectionError onRetry={onRetry} />
          ) : suggestionCount > 0 ? (
            <button type="button" className="btn btn-sm btn-outline-mc mb-3" onClick={() => onNavigate("corrections")}>
              <PencilLine size={14} aria-hidden="true" /> {t("dashboard.attention.reviewSuggestions", { count: suggestionCount })}
            </button>
          ) : (
            <p className="text-muted small">{t("dashboard.attention.noCorrections")}</p>
          )}
        </>
      )}
      {settings && (
        <>
          <h3 className="mc-dash-subhead">{t("dashboard.attention.feedback")} {complaintCount > 0 && <span className="badge bg-warning text-dark">{complaintCount}</span>}</h3>
          {complaintCount > 0 ? (
            <button type="button" className="btn btn-sm btn-outline-mc mb-3" onClick={() => onNavigate("feedback")}>
              <Inbox size={14} aria-hidden="true" /> {t("dashboard.attention.answerMessages", { count: complaintCount })}
            </button>
          ) : (
            <p className="text-muted small">{t("dashboard.attention.noFeedback")}</p>
          )}
        </>
      )}
      {content && goodsCount > 0 && (
        <button type="button" className="btn btn-sm btn-outline-mc mb-3" onClick={() => onNavigate("goods")}>
          <PackageOpen size={14} aria-hidden="true" /> {t("dashboard.attention.goodsPledges", { count: goodsCount })}
        </button>
      )}
      {content && <>
      <h3 className="mc-dash-subhead">{t("dashboard.attention.pendingPledges")} {pledgeCount > 0 && <span className="badge bg-warning text-dark">{pledgeCount}</span>}</h3>
      {failed.includes("pending_pledges") ? (
        <SectionError onRetry={onRetry} />
      ) : pledges.length ? (
        <ul className="list-unstyled mc-dash-list mb-1">
          {pledges.map((pledge) => (
            <li key={pledge.id}>
              <div className="min-w-0">
                <div className="fw-semibold">{money(pledge)} · {pledge.is_anonymous ? t("dashboard.attention.anonymous") : pledge.donor_name || t("dashboard.attention.unnamed")}</div>
                <div className="small text-muted text-truncate">{pledge.campaign_title} · {pledge.payment_method.replaceAll("_", " ")}{pledge.reference ? ` · ${t("dashboard.attention.ref", { ref: pledge.reference })}` : ""}</div>
              </div>
              <div className="d-flex gap-1 flex-shrink-0">
                <button type="button" className="btn btn-sm btn-success" disabled={Boolean(busy)} onClick={() => review(pledge, "confirm")} aria-label={t("dashboard.attention.confirmAria", { amount: money(pledge), campaign: pledge.campaign_title })}>
                  <Check size={14} aria-hidden="true" /> <span className="d-none d-sm-inline">{t("dashboard.attention.confirm")}</span>
                </button>
                <button type="button" className="btn btn-sm btn-outline-danger" disabled={Boolean(busy)} onClick={() => review(pledge, "reject")} aria-label={t("dashboard.attention.rejectAria", { amount: money(pledge), campaign: pledge.campaign_title })}>
                  <X size={14} aria-hidden="true" /> <span className="d-none d-sm-inline">{t("dashboard.attention.reject")}</span>
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted small">{t("dashboard.attention.noPledges")} {Object.keys(handled).length > 0 && t("dashboard.attention.allDone")}</p>
      )}
      {pledgeCount > pledges.length && <button type="button" className="btn btn-link btn-sm text-mc p-0 mb-2" onClick={() => onNavigate("donations")}>{t("dashboard.attention.seeAll", { count: pledgeCount })}</button>}
      {error && <div className="alert alert-danger py-2 small" role="alert">{error}</div>}

      <h3 className="mc-dash-subhead mt-3">{t("dashboard.attention.reports")} {reports.length > 0 && <span className="badge bg-danger">{data.summary?.pending_content_reports_count ?? reports.length}</span>}</h3>
      {reports.length ? (
        <ul className="list-unstyled small mb-0">
          {reports.slice(0, 4).map((report) => (
            <li key={report.id} className="mb-1">
              <span className="fw-semibold">{t(`superAdmin.reports.targets.${report.type}`, { defaultValue: report.type })}</span> · {t(`superAdmin.reports.categories.${report.category}`, { defaultValue: report.category })} · {formatShortDate(report.created_at, locale)}
              {report.reason && <div className="text-muted text-truncate">“{report.reason}”</div>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted small">{t("dashboard.attention.noReports")}</p>
      )}
      {reports.length > 0 && <p className="form-text mt-1 mb-0">{t("dashboard.attention.reportsNote")}</p>}
      </>}

      {settings && <>
      <h3 className="mc-dash-subhead mt-3">{completeness ? t("dashboard.attention.profilePercent", { percent: completeness.percentage }) : t("dashboard.attention.profile")}</h3>
      {failed.includes("profile_completeness") ? (
        <SectionError onRetry={onRetry} />
      ) : completeness ? (
        <>
          <div className="progress mb-2" role="progressbar" aria-label={t("dashboard.attention.progress")} aria-valuenow={completeness.percentage} aria-valuemin="0" aria-valuemax="100" style={{ height: 6 }}>
            <div className="progress-bar mc-dash-progress" style={{ width: `${completeness.percentage}%` }} />
          </div>
          <ul className="list-unstyled small mb-0 mc-dash-checklist">
            {completeness.items.map((item) => (
              <li key={item.key} className={item.done ? "is-done" : undefined}>
                {item.done ? <CheckCircle2 size={15} aria-hidden="true" /> : <Circle size={15} aria-hidden="true" />}
                <span className="visually-hidden">{item.done ? t("dashboard.attention.done") : t("dashboard.attention.missing")}</span>
                {/* [Urmee · i18n dashboard] The API sends English labels for the checklist; they are translated by key. */}
                {item.done ? checklistLabel(t, item) : <button type="button" className="btn btn-link btn-sm p-0 text-mc" onClick={() => onNavigate(item.section)}>{t("dashboard.attention.add", { item: checklistLabel(t, item).toLowerCase() })}</button>}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      </>}
    </DashboardCard>
  );
}

const CHECKLIST_KEYS = ["photo", "phone", "description", "facilities", "prayer_times", "location", "jumuah"];
const checklistLabel = (t, item) => (CHECKLIST_KEYS.includes(item.key) ? t(`dashboard.checklist.${item.key}`) : item.label);

function SectionError({ onRetry }) {
  const { t } = useLocale();
  return (
    <p className="small text-danger mb-2" role="alert">
      {t("dashboard.attention.couldNotLoad")} <button type="button" className="btn btn-link btn-sm p-0" onClick={onRetry}>{t("common.retry")}</button>
    </p>
  );
}
