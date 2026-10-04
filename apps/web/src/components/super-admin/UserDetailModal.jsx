import { useEffect, useState } from "react";
import Modal from "../Modal";
import { fetchManagedUser } from "../../utils/systemAdminApi";
import { BlockStack, SkeletonRegion } from "../skeletons";
import { useLocale } from "../../hooks/useLocale";
import { enumLabel, statusLabel } from "../../utils/labels";
import { formatNumber } from "../../utils/intl";

// [Urmee · i18n super-admin] Dates follow the active language.
const dateTime = (value, locale) => value ? new Intl.DateTimeFormat(locale === "en-BD" ? "en-GB" : locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
const ROLES = ["normal_user", "mosque_admin", "super_admin"];
const TARGETS = ["announcement", "event", "campaign", "mosque", "review"];
const labelize = (value = "") => String(value).replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

function Section({ title, empty, items, render }) {
  return (
    <section className="mb-4">
      <h3 className="h6 fw-bold">{title} <span className="badge bg-secondary-subtle text-secondary-emphasis">{items.length}</span></h3>
      {items.length === 0 ? <p className="small text-muted mb-0">{empty}</p> : <ul className="list-unstyled small mb-0">{items.map(render)}</ul>}
    </section>
  );
}

/** One account at a glance: mosques, claims, reports, donations and suspension history. */
export default function UserDetailModal({ userId, onClose }) {
  const { t, locale } = useLocale();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetchManagedUser(userId, { signal: controller.signal })
      .then((payload) => setData(payload.data))
      .catch((requestError) => { if (requestError.name !== "AbortError") setError(requestError.message); });
    return () => controller.abort();
  }, [userId]);

  const user = data?.user;

  return (
    <Modal title={user ? user.name : t("userDetail.title")} onClose={onClose} size="modal-lg">
      {error && <div className="alert alert-danger">{error}</div>}
      {!data && !error && <SkeletonRegion label={t("userDetail.loading")}><BlockStack heights={[32, 120, 120]} /></SkeletonRegion>}
      {data && (
        <>
          <div className="d-flex flex-wrap gap-3 small mb-4 border-bottom pb-3">
            <span><span className="text-muted">{t("userDetail.phone")}</span> {user.phone}</span>
            {user.email && <span><span className="text-muted">{t("userDetail.email")}</span> {user.email}</span>}
            <span><span className="text-muted">{t("userDetail.role")}</span> {enumLabel(t, "superAdmin.roles", ROLES, user.role)}</span>
            <span><span className="text-muted">{t("userDetail.account")}</span> {user.account_status === "suspended" ? t("superAdmin.users.suspended") : t("superAdmin.users.active")}</span>
            <span><span className="text-muted">{t("userDetail.joined")}</span> {dateTime(user.created_at, locale)}</span>
            <span><span className="text-muted">{t("userDetail.follows")}</span> {t("userDetail.followsCount", { count: user.followed_mosques_count })}</span>
          </div>
          {user.suspension_reason && <div className="alert alert-danger small">{t("userDetail.suspended", { reason: user.suspension_reason })}</div>}
          <div className="row">
            <div className="col-md-6">
              <Section title={t("userDetail.managed")} empty={t("userDetail.none")} items={data.managed_mosques} render={(mosque) => <li key={mosque.id} className="d-flex justify-content-between border-bottom py-1"><span>{mosque.name}</span><span className="text-muted">{t(`dashboard.roles.${mosque.role}`, { defaultValue: labelize(mosque.role || "") })}</span></li>} />
              <Section title={t("userDetail.claims")} empty={t("userDetail.noClaims")} items={data.claims} render={(claim) => <li key={claim.id} className="border-bottom py-1"><div className="d-flex justify-content-between"><span>{claim.mosque?.name || t("userDetail.mosqueFallback", { id: claim.mosque_id })}</span><span className="text-muted">{statusLabel(t, claim.status)}</span></div><div className="text-muted">{dateTime(claim.submitted_at, locale)}{claim.ai_score != null && ` · ${t("superAdmin.more.aiScore", { percent: formatNumber(Math.round(claim.ai_score * 100), locale) })}`}</div></li>} />
              <Section title={t("userDetail.history")} empty={t("userDetail.neverSuspended")} items={data.suspension_history} render={(entry) => <li key={entry.id} className="border-bottom py-1"><div className="d-flex justify-content-between"><span className={entry.status === "suspended" ? "text-danger" : "text-success"}>{entry.status === "suspended" ? t("superAdmin.users.suspended") : t("superAdmin.users.active")}</span><span className="text-muted">{dateTime(entry.created_at, locale)}</span></div><div className="text-muted">{entry.reason ? `${entry.reason} · ` : ""}{t("userDetail.by", { name: entry.actor?.name || t("userDetail.system") })}</div></li>} />
            </div>
            <div className="col-md-6">
              <Section title={t("userDetail.reports")} empty={t("userDetail.noReports")} items={data.reports} render={(report) => <li key={report.id} className="border-bottom py-1"><div className="d-flex justify-content-between"><span>{t(`superAdmin.reports.categories.${report.category}`, { defaultValue: labelize(report.category) })} · {enumLabel(t, "superAdmin.reports.targets", TARGETS, report.reportable_type)} #{report.reportable_id}</span><span className="text-muted">{statusLabel(t, report.status)}</span></div><div className="text-muted">{report.reason}</div></li>} />
              <Section title={t("userDetail.donations")} empty={t("userDetail.noDonations")} items={data.donations} render={(donation) => <li key={donation.id} className="d-flex justify-content-between border-bottom py-1"><span>{donation.campaign?.title || t("userDetail.campaignFallback", { id: donation.campaign_id })}</span><span className="text-muted">{formatNumber(Number(donation.amount), locale)} · {statusLabel(t, donation.status)}</span></li>} />
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}
