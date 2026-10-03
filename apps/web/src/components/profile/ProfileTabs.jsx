import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ConfirmDialog from "../ConfirmDialog";
import { ListRowsSkeleton, SkeletonRegion } from "../skeletons";
import { apiRequest } from "../../utils/api";
import { useLocale } from "../../hooks/useLocale";

/**
 * [Urmee · F6 Part 3] Small loader hook for a Profile tab: runs `load(signal)` and exposes reload().
 * Each tab owns its data so Profile.jsx only has to render the component.
 */
function useTabData(load) {
  const [state, setState] = useState({ status: "loading", items: [], error: "" });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState((current) => ({ ...current, status: "loading", error: "" }));
    load(controller.signal)
      .then((items) => setState({ status: "done", items, error: "" }))
      .catch((error) => { if (error.name !== "AbortError") setState({ status: "error", items: [], error: error.message }); });
    return () => controller.abort();
  }, [load, revision]);
  return { ...state, reload: () => setRevision((n) => n + 1) };
}

function TabShell({ label, data, empty, children }) {
  const { t } = useLocale(); // [Urmee · i18n profile] text from the locale files
  return (
    <>
      <SkeletonRegion label={label} loading={data.status === "loading"}><ListRowsSkeleton rows={3} /></SkeletonRegion>
      {data.status === "error" && <div className="alert alert-danger" role="alert">{data.error} <button type="button" className="btn btn-sm btn-outline-danger ms-2" onClick={data.reload}>{t("common.retry")}</button></div>}
      {data.status === "done" && data.items.length === 0 && <p className="text-muted">{empty}</p>}
      {data.status === "done" && data.items.map(children)}
    </>
  );
}

// [Urmee · F6 Part 3] One badge style per status, shared by the three tabs; the label is profileTabs.status.<status>.
const BADGE = { pending: "bg-warning text-dark", accepted: "bg-success", rejected: "bg-secondary", cancelled: "bg-secondary", active: "bg-success", completed: "bg-success", closed: "bg-secondary", expired: "bg-secondary" };
const StatusBadge = ({ status }) => {
  const { t } = useLocale();
  return <span className={`badge ${BADGE[status] || "bg-secondary"}`}>{t(`profileTabs.status.${status}`, { defaultValue: status })}</span>;
};

// One opportunity at a time, because /api/me/volunteer-registrations only returns ids and a status.
// [Urmee · F6 Part 3] The registrations endpoint only returns ids and a status, so each opportunity is
// fetched for its title, date and mosque.
const loadVolunteering = async (signal) => {
  const { data } = await apiRequest("/api/me/volunteer-registrations", { signal });
  return Promise.all((data || []).map(async (registration) => {
    try {
      const { data: opportunity } = await apiRequest(`/api/volunteer-opportunities/${registration.volunteer_opportunity_id}`, { signal });
      return { ...registration, opportunity };
    } catch (error) {
      if (error.name === "AbortError") throw error;
      return { ...registration, opportunity: null };
    }
  }));
};

/** [Urmee · F6 Part 3] "Volunteering" tab: my sign-ups, with "Cancel sign-up" (asks first). */
export function VolunteeringTab() {
  const { t } = useLocale();
  const data = useTabData(loadVolunteering);
  const [confirm, setConfirm] = useState(null);

  return (
    <>
      <TabShell label={t("profileTabs.volunteerLoading")} data={data} empty={<>{t("profileTabs.volunteerEmpty")} <Link to="/volunteers">{t("profileTabs.seeOpportunities")}</Link>.</>}>
        {(item) => {
          const opportunity = item.opportunity;
          const cancellable = ["pending", "accepted"].includes(item.status);
          return (
            <div className="border rounded p-3 mb-3" key={item.id}>
              <div className="d-flex flex-wrap align-items-center gap-2">
                <Link to={`/volunteers?opportunity=${item.volunteer_opportunity_id}`} className="fw-semibold me-auto">{opportunity?.title || t("profileTabs.opportunityFallback", { id: item.volunteer_opportunity_id })}</Link>
                <StatusBadge status={item.status} />
              </div>
              {opportunity && (
                <p className="small text-muted mb-0 mt-1">
                  {opportunity.mosque?.name && <>{opportunity.mosque.name} · </>}
                  {opportunity.opportunity_date}{opportunity.start_time && ` · ${opportunity.start_time}${opportunity.end_time ? `–${opportunity.end_time}` : ""}`}
                  {opportunity.location && ` · ${opportunity.location}`}
                </p>
              )}
              {cancellable && <button type="button" className="btn btn-sm btn-outline-danger mt-2" onClick={() => setConfirm(item)}>{t("profileTabs.cancelSignup")}</button>}
            </div>
          );
        }}
      </TabShell>
      {confirm && (
        <ConfirmDialog
          title={t("profileTabs.cancelSignupTitle")}
          message={confirm.opportunity?.title || t("profileTabs.opportunityDefault")}
          confirmLabel={t("profileTabs.cancelSignup")}
          tone="danger"
          onConfirm={async () => { await apiRequest(`/api/volunteer-opportunities/${confirm.volunteer_opportunity_id}/register`, { method: "DELETE" }); data.reload(); }}
          onClose={() => setConfirm(null)}
        />
      )}
    </>
  );
}

const loadMyBloodRequests = async (signal) => (await apiRequest("/api/blood-requests/me", { signal })).data || [];

/** [Urmee · F6 Part 3] "My blood requests" tab: status, number of offers, and Mark fulfilled / Close. */
export function MyBloodRequestsTab() {
  const { t } = useLocale();
  const data = useTabData(loadMyBloodRequests);
  const [confirm, setConfirm] = useState(null);

  return (
    <>
      <TabShell label={t("profileTabs.bloodLoading")} data={data} empty={<>{t("profileTabs.bloodEmpty")} <Link to="/blood-donation">{t("profileTabs.requestBlood")}</Link>.</>}>
        {(item) => (
          <div className="border rounded p-3 mb-3" key={item.id}>
            <div className="d-flex flex-wrap align-items-center gap-2">
              <span className="badge bg-danger-subtle text-danger fs-6">{item.blood_group}</span>
              <Link to={`/blood-donation/${item.id}`} className="fw-semibold me-auto">{item.hospital_or_location}</Link>
              {(item.urgency === "high" || item.urgency === "critical") && <span className="badge bg-danger">{t(`urgency.${item.urgency}`)}</span>}
              <StatusBadge status={item.status} />
            </div>
            <p className="small text-muted mb-0 mt-1">{t("profileTabs.bloodInfo", { date: item.required_date, units: item.units || 1, offers: item.responses_count ?? 0 })}</p>
            <div className="d-flex flex-wrap gap-2 mt-2">
              <Link to={`/blood-donation/${item.id}`} className="btn btn-sm btn-outline-mc">{item.responses_count ? t("profileTabs.seeOffers") : t("profileTabs.view")}</Link>
              {item.status === "active" && (
                <>
                  <button type="button" className="btn btn-sm btn-outline-success" onClick={() => setConfirm({ item, status: "completed", title: t("profileTabs.markFulfilledTitle"), label: t("profileTabs.markFulfilled"), tone: "success" })}>{t("profileTabs.markFulfilled")}</button>
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setConfirm({ item, status: "closed", title: t("profileTabs.closeTitle"), label: t("profileTabs.closeConfirm"), tone: "danger" })}>{t("profileTabs.close")}</button>
                </>
              )}
            </div>
          </div>
        )}
      </TabShell>
      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          message={t("profileTabs.bloodAt", { group: confirm.item.blood_group, place: confirm.item.hospital_or_location })}
          confirmLabel={confirm.label}
          tone={confirm.tone}
          onConfirm={async () => { await apiRequest(`/api/blood-requests/${confirm.item.id}/status`, { method: "PATCH", body: { status: confirm.status } }); data.reload(); }}
          onClose={() => setConfirm(null)}
        />
      )}
    </>
  );
}

// /api/me/blood-responses only returns { id, blood_request_id }, so the request itself is fetched for each one.
// [Urmee · F6 Part 3] Same idea: the responses endpoint returns only ids, so each request is fetched.
// A request that is closed is hidden from everyone but its owner, hence the "no longer open" fallback.
// The API doesn't return my message yet, so it only shows once it does.
const loadMyBloodResponses = async (signal) => {
  const { data } = await apiRequest("/api/me/blood-responses", { signal });
  return Promise.all((data || []).map(async (response) => {
    try {
      const { data: request } = await apiRequest(`/api/blood-requests/${response.blood_request_id}`, { signal });
      return { ...response, request };
    } catch (error) {
      if (error.name === "AbortError") throw error;
      return { ...response, request: null }; // closed requests are hidden from everyone but their owner
    }
  }));
};

/** [Urmee · F6 Part 3] "Blood responses" tab: the requests I offered to donate to, with their current status. */
export function MyBloodResponsesTab() {
  const { t } = useLocale();
  const data = useTabData(loadMyBloodResponses);
  return (
    <TabShell label={t("profileTabs.responsesLoading")} data={data} empty={<>{t("profileTabs.responsesEmpty")} <Link to="/blood-donation">{t("profileTabs.seeOpenRequests")}</Link>.</>}>
      {(item) => (
        <div className="border rounded p-3 mb-3" key={item.id}>
          {item.request ? (
            <>
              <div className="d-flex flex-wrap align-items-center gap-2">
                <span className="badge bg-danger-subtle text-danger fs-6">{item.request.blood_group}</span>
                <Link to={`/blood-donation/${item.request.id}`} className="fw-semibold me-auto">{item.request.hospital_or_location}</Link>
                <StatusBadge status={item.request.status} />
              </div>
              <p className="small text-muted mb-0 mt-1">{t("profileTabs.neededBy", { date: item.request.required_date })}</p>
            </>
          ) : (
            <p className="mb-0 text-muted">{t("profileTabs.noLongerOpen", { id: item.blood_request_id })}</p>
          )}
          {item.message && <p className="small mb-0 mt-1">{t("profileTabs.yourMessage", { message: item.message })}</p>}
        </div>
      )}
    </TabShell>
  );
}
