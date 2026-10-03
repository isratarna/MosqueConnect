import { useCallback, useEffect, useState } from "react";
import { Check, CircleX, Edit3, Eye, Plus, RefreshCw, Trash2, X } from "lucide-react";
import CampaignProgress from "../campaigns/CampaignProgress";
import CampaignStatusBadge from "../campaigns/CampaignStatusBadge";
import {
  CAMPAIGN_CATEGORIES, deleteAdminCampaign, fetchAdminCampaigns, fetchCampaignDonations,
  reviewCampaignDonation, saveAdminCampaign, transitionAdminCampaign,
} from "../../utils/campaignApi";
import { formatCampaignDate, formatCampaignMoney } from "../../utils/campaignFormat";
import { campaignCategoryLabel, enumLabel, statusLabel } from "../../utils/labels";
import { useLocale } from "../../hooks/useLocale";

const PAYMENT_METHODS = ["mobile_banking", "bank_transfer", "cash", "other"];

const emptyForm = () => ({
  title: "", summary: "", description: "", category: CAMPAIGN_CATEGORIES[0], target_amount: "",
  starts_on: new Date().toISOString().slice(0, 10), ends_on: "", image_url: "", status: "draft",
});

export default function CampaignManager({ mosqueId }) {
  const { t, locale } = useLocale();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [reviewing, setReviewing] = useState(null);

  const load = useCallback((signal) => {
    if (!mosqueId) return Promise.resolve();
    setLoading(true);
    setError("");
    return fetchAdminCampaigns(mosqueId, { signal })
      .then(setCampaigns)
      .catch((requestError) => { if (requestError.name !== "AbortError") setError(requestError.message || t("campaign.loadError")); })
      .finally(() => { if (!signal?.aborted) setLoading(false); });
  }, [mosqueId, t]);

  useEffect(() => { const controller = new AbortController(); load(controller.signal); return () => controller.abort(); }, [load]);

  const setValue = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  const startCreate = () => { setEditing("new"); setForm(emptyForm()); setError(""); };
  const startEdit = (campaign) => {
    setEditing(campaign.id);
    setForm({
      title: campaign.title, summary: campaign.summary, description: campaign.description, category: campaign.category,
      target_amount: campaign.target_amount, starts_on: campaign.starts_on, ends_on: campaign.ends_on,
      image_url: campaign.image_url || "", status: campaign.status,
    });
    setError("");
  };

  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const payload = { ...form, target_amount: Number(form.target_amount), image_url: form.image_url || null };
      if (editing !== "new") delete payload.status;
      await saveAdminCampaign(mosqueId, editing === "new" ? null : editing, payload);
      setNotice(editing === "new" ? t("admin.campaigns.created") : t("admin.campaigns.updated"));
      setEditing(null); await load();
    } catch (requestError) { setError(requestError.message || t("admin.campaigns.saveFailed")); }
    finally { setSaving(false); }
  };

  const transition = async (campaign, action) => {
    setError("");
    try { await transitionAdminCampaign(mosqueId, campaign.id, action); setNotice(t("admin.campaigns.statusUpdated")); await load(); }
    catch (requestError) { setError(requestError.message || t("admin.campaigns.statusFailed")); }
  };

  const remove = async (campaign) => {
    if (!window.confirm(t("admin.campaigns.confirmDelete", { title: campaign.title }))) return;
    try { await deleteAdminCampaign(mosqueId, campaign.id); setNotice(t("admin.campaigns.deleted")); setReviewing(null); await load(); }
    catch (requestError) { setError(requestError.message || t("admin.campaigns.deleteFailed")); }
  };

  if (!mosqueId) return <div className="alert alert-warning">{t("admin.campaigns.noMosque")}</div>;

  return (
    <div className="mc-admin-campaigns">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 border-bottom pb-3 mb-4">
        <div><h4 className="fw-bold mb-1">{t("admin.campaigns.title")}</h4><p className="text-muted small mb-0">{t("admin.campaigns.intro")}</p></div>
        <button className="btn btn-mc" type="button" onClick={startCreate}><Plus size={16} /> {t("admin.campaigns.newCampaign")}</button>
      </div>
      {notice && <div className="alert alert-success alert-dismissible" role="status">{notice}<button className="btn-close" type="button" aria-label={t("admin.campaigns.dismiss")} onClick={() => setNotice("")} /></div>}
      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      {editing && <CampaignForm form={form} setValue={setValue} saving={saving} isNew={editing === "new"} onSubmit={submit} onCancel={() => setEditing(null)} />}
      {loading && <div className="text-center text-muted py-5" role="status">{t("admin.campaigns.loading")}</div>}
      {!loading && campaigns.length === 0 && !editing && <div className="mc-admin-campaigns__empty">{t("admin.campaigns.empty")}</div>}
      <div className="mc-admin-campaigns__list">
        {campaigns.map((campaign) => (
          <article className="mc-admin-campaign" key={campaign.id}>
            <div className="mc-admin-campaign__heading">
              <div><div className="d-flex align-items-center gap-2 mb-1"><CampaignStatusBadge status={campaign.status} /><span className="small text-muted">{campaignCategoryLabel(t, campaign.category)}</span></div><h5>{campaign.title}</h5><p>{campaign.summary}</p></div>
              <div className="mc-admin-campaign__actions">
                <button className="btn btn-sm btn-outline-mc" type="button" onClick={() => startEdit(campaign)}><Edit3 size={15} /> {t("admin.campaigns.edit")}</button>
                {campaign.status === "draft" && <button className="btn btn-sm btn-success" type="button" onClick={() => transition(campaign, "activate")}><Check size={15} /> {t("admin.campaigns.activate")}</button>}
                {campaign.status === "active" && <button className="btn btn-sm btn-success" type="button" onClick={() => transition(campaign, "complete")}><Check size={15} /> {t("admin.campaigns.complete")}</button>}
                {(campaign.status === "draft" || campaign.status === "active") && <button className="btn btn-sm btn-outline-secondary" type="button" onClick={() => transition(campaign, "cancel")}><CircleX size={15} /> {t("admin.campaigns.cancel")}</button>}
                <button className="btn btn-sm btn-outline-danger" type="button" onClick={() => remove(campaign)} title={t("admin.campaigns.deleteTitle")} aria-label={t("admin.campaigns.deleteTitle")}><Trash2 size={15} /></button>
              </div>
            </div>
            <CampaignProgress campaign={campaign} compact />
            <div className="mc-admin-campaign__footer"><span>{t("campaign.ends", { date: formatCampaignDate(campaign.ends_on, locale, t("common.notSpecified")) })}</span><button className="btn btn-sm btn-link text-mc" type="button" onClick={() => setReviewing(reviewing === campaign.id ? null : campaign.id)}><Eye size={15} /> {t("admin.campaigns.reviewSupport")} {campaign.pending_donations_count > 0 && <span className="badge bg-warning text-dark">{campaign.pending_donations_count}</span>}</button></div>
            {reviewing === campaign.id && <DonationReview mosqueId={mosqueId} campaign={campaign} onChanged={load} />}
          </article>
        ))}
      </div>
    </div>
  );
}

function CampaignForm({ form, setValue, saving, isNew, onSubmit, onCancel }) {
  const { t } = useLocale();

  return (
    <form className="mc-admin-campaign-form" onSubmit={onSubmit}>
      <div className="d-flex justify-content-between align-items-center"><h5>{isNew ? t("admin.campaigns.form.createTitle") : t("admin.campaigns.form.editTitle")}</h5><button className="btn btn-sm btn-link text-secondary" type="button" onClick={onCancel} aria-label={t("common.close")}><X size={18} /></button></div>
      <div className="row g-3 mt-0">
        <div className="col-md-8"><label className="form-label" htmlFor="admin-campaign-title">{t("admin.campaigns.form.title")}</label><input id="admin-campaign-title" className="form-control" value={form.title} onChange={setValue("title")} maxLength="255" required /></div>
        <div className="col-md-4"><label className="form-label" htmlFor="admin-campaign-category">{t("admin.campaigns.form.category")}</label><select id="admin-campaign-category" className="form-select" value={form.category} onChange={setValue("category")}>{CAMPAIGN_CATEGORIES.map((item) => <option key={item} value={item}>{campaignCategoryLabel(t, item)}</option>)}</select></div>
        <div className="col-12"><label className="form-label" htmlFor="admin-campaign-summary">{t("admin.campaigns.form.summary")}</label><input id="admin-campaign-summary" className="form-control" value={form.summary} onChange={setValue("summary")} maxLength="500" required /></div>
        <div className="col-12"><label className="form-label" htmlFor="admin-campaign-description">{t("admin.campaigns.form.details")}</label><textarea id="admin-campaign-description" className="form-control" rows="5" value={form.description} onChange={setValue("description")} required /></div>
        <div className="col-md-4"><label className="form-label" htmlFor="admin-campaign-target">{t("admin.campaigns.form.target")}</label><input id="admin-campaign-target" className="form-control" type="number" min="1" step="0.01" value={form.target_amount} onChange={setValue("target_amount")} required /></div>
        <div className="col-md-4"><label className="form-label" htmlFor="admin-campaign-start">{t("admin.campaigns.form.start")}</label><input id="admin-campaign-start" className="form-control" type="date" value={form.starts_on} onChange={setValue("starts_on")} required /></div>
        <div className="col-md-4"><label className="form-label" htmlFor="admin-campaign-end">{t("admin.campaigns.form.end")}</label><input id="admin-campaign-end" className="form-control" type="date" value={form.ends_on} onChange={setValue("ends_on")} required /></div>
        <div className={isNew ? "col-md-8" : "col-12"}><label className="form-label" htmlFor="admin-campaign-image">{t("admin.campaigns.form.image")} <span className="text-muted">{t("common.optional")}</span></label><input id="admin-campaign-image" className="form-control" type="url" value={form.image_url} onChange={setValue("image_url")} /></div>
        {isNew && <div className="col-md-4"><label className="form-label" htmlFor="admin-campaign-status">{t("admin.campaigns.form.initialStatus")}</label><select id="admin-campaign-status" className="form-select" value={form.status} onChange={setValue("status")}><option value="draft">{t("admin.campaigns.form.saveDraft")}</option><option value="active">{t("admin.campaigns.form.publishNow")}</option></select></div>}
      </div>
      <div className="d-flex justify-content-end gap-2 mt-4"><button className="btn btn-outline-mc" type="button" onClick={onCancel}>{t("common.cancel")}</button><button className="btn btn-mc" type="submit" disabled={saving}>{saving ? t("admin.campaigns.form.saving") : t("admin.campaigns.form.save")}</button></div>
    </form>
  );
}

function DonationReview({ mosqueId, campaign, onChanged }) {
  const { t, locale } = useLocale();
  const [items, setItems] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const loadDonations = useCallback((signal) => {
    setLoading(true); setError("");
    return fetchCampaignDonations(mosqueId, campaign.id, { signal }).then(setItems)
      .catch((requestError) => { if (requestError.name !== "AbortError") setError(requestError.message); })
      .finally(() => { if (!signal?.aborted) setLoading(false); });
  }, [mosqueId, campaign.id]);
  useEffect(() => { const controller = new AbortController(); loadDonations(controller.signal); return () => controller.abort(); }, [loadDonations]);
  const review = async (item, action) => {
    try { await reviewCampaignDonation(mosqueId, campaign.id, item.id, action); await loadDonations(); await onChanged(); }
    catch (requestError) { setError(requestError.message); }
  };
  return (
    <section className="mc-donation-review">
      <div className="d-flex justify-content-between"><h6>{t("admin.campaigns.review.title")}</h6><button className="btn btn-sm btn-link" type="button" onClick={() => loadDonations()}><RefreshCw size={14} /> {t("admin.campaigns.review.refresh")}</button></div>
      {error && <div className="alert alert-danger py-2">{error}</div>}{loading && <p className="text-muted small">{t("admin.campaigns.review.loading")}</p>}
      {!loading && items.length === 0 && <p className="text-muted small mb-0">{t("admin.campaigns.review.none")}</p>}
      {items.map((item) => <div className="mc-donation-review__row" key={item.id}><div><strong>{item.is_anonymous ? t("admin.campaigns.review.anonymous") : item.donor_name || t("admin.campaigns.review.unnamed")}</strong><span>{formatCampaignMoney(item.amount, campaign.currency, locale)} · {enumLabel(t, "campaign.action.methods", PAYMENT_METHODS, item.payment_method)}</span>{item.reference && <small>{t("admin.campaigns.review.ref", { ref: item.reference })}</small>}</div><div className="d-flex align-items-center gap-2"><span className={`badge ${item.status === "confirmed" ? "bg-success" : item.status === "rejected" ? "bg-secondary" : "bg-warning text-dark"}`}>{statusLabel(t, item.status)}</span>{item.status === "pending" && <><button className="btn btn-sm btn-success" type="button" onClick={() => review(item, "confirm")}><Check size={14} /> {t("admin.campaigns.review.confirm")}</button><button className="btn btn-sm btn-outline-danger" type="button" onClick={() => review(item, "reject")}><X size={14} /> {t("admin.campaigns.review.reject")}</button></>}</div></div>)}
    </section>
  );
}
