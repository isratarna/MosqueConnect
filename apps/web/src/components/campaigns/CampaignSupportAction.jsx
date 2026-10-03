import { useState } from "react";
import { HeartHandshake } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { submitCampaignDonation } from "../../utils/campaignApi";
import { translate } from "../../i18n/translate";
import { useLocale } from "../../hooks/useLocale";
import SupportModal from "../SupportModal";

const INITIAL = { donor_name: "", contact: "", amount: "", payment_method: "mobile_banking", reference: "", message: "", is_anonymous: false };

export default function CampaignSupportAction({ campaign }) {
  const { t } = useLocale();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const setValue = (field) => (event) => setValues((current) => ({
    ...current,
    [field]: event.target.type === "checkbox" ? event.target.checked : event.target.value,
  }));

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const payload = await submitCampaignDonation(campaign.id, { ...values, amount: Number(values.amount) });
      setSuccess(payload.message || translate("campaign.action.success"));
      setValues(INITIAL);
    } catch (requestError) {
      setError(requestError.message || translate("campaign.action.submitError"));
    } finally {
      setSubmitting(false);
    }
  };

  if (!campaign.accepts_donations) return <button className="btn btn-secondary w-100" disabled>{t("campaign.action.closed")}</button>;
  if (!user) return <Link className="btn btn-mc w-100" to="/login"><HeartHandshake size={17} /> {t("campaign.action.signIn")}</Link>;

  return (
    <>
      <button type="button" className="btn btn-mc w-100" onClick={() => { setOpen(true); setSuccess(""); }}>
        <HeartHandshake size={17} /> {t("campaign.action.support")}
      </button>
      {open && (
        <SupportModal title={t("campaign.action.modalTitle", { title: campaign.title })} description={t("campaign.action.modalDescription")} onClose={() => setOpen(false)}>
          {success ? (
            <div className="mc-campaign-support-success" role="status">
              <HeartHandshake size={38} aria-hidden="true" />
              <h3>{t("campaign.action.thanksTitle")}</h3>
              <p>{success}</p>
              <button className="btn btn-mc" type="button" onClick={() => setOpen(false)}>{t("campaign.action.done")}</button>
            </div>
          ) : (
            <form className="mc-campaign-support-form" onSubmit={submit}>
              {error && <div className="alert alert-danger" role="alert">{error}</div>}
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label" htmlFor="campaign-donor-name">{t("campaign.action.donorName")}</label>
                  <input id="campaign-donor-name" className="form-control" value={values.donor_name} onChange={setValue("donor_name")} required={!values.is_anonymous} disabled={values.is_anonymous} />
                </div>
                <div className="col-md-6">
                  <label className="form-label" htmlFor="campaign-contact">{t("campaign.action.contact")}</label>
                  <input id="campaign-contact" className="form-control" value={values.contact} onChange={setValue("contact")} required />
                </div>
                <div className="col-md-6">
                  <label className="form-label" htmlFor="campaign-amount">{t("campaign.action.amount")}</label>
                  <input id="campaign-amount" type="number" min="1" step="0.01" className="form-control" value={values.amount} onChange={setValue("amount")} required />
                </div>
                <div className="col-md-6">
                  <label className="form-label" htmlFor="campaign-method">{t("campaign.action.method")}</label>
                  <select id="campaign-method" className="form-select" value={values.payment_method} onChange={setValue("payment_method")} required>
                    <option value="mobile_banking">{t("campaign.action.methods.mobile_banking")}</option>
                    <option value="bank_transfer">{t("campaign.action.methods.bank_transfer")}</option>
                    <option value="cash">{t("campaign.action.methods.cash")}</option>
                    <option value="other">{t("campaign.action.methods.other")}</option>
                  </select>
                </div>
                <div className="col-12">
                  <label className="form-label" htmlFor="campaign-reference">{t("campaign.action.reference")} <span className="text-muted">{t("common.optional")}</span></label>
                  <input id="campaign-reference" className="form-control" value={values.reference} onChange={setValue("reference")} />
                </div>
                <div className="col-12">
                  <label className="form-label" htmlFor="campaign-message">{t("campaign.action.message")} <span className="text-muted">{t("common.optional")}</span></label>
                  <textarea id="campaign-message" className="form-control" rows="3" value={values.message} onChange={setValue("message")} />
                </div>
                <div className="col-12 form-check ms-2">
                  <input id="campaign-anonymous" type="checkbox" className="form-check-input" checked={values.is_anonymous} onChange={setValue("is_anonymous")} />
                  <label className="form-check-label" htmlFor="campaign-anonymous">{t("campaign.action.anonymous")}</label>
                </div>
              </div>
              <p className="form-text mt-3">{t("campaign.action.note")}</p>
              <div className="d-flex justify-content-end gap-2 mt-4">
                <button className="btn btn-outline-mc" type="button" onClick={() => setOpen(false)}>{t("common.cancel")}</button>
                <button className="btn btn-mc" type="submit" disabled={submitting}>{submitting ? t("campaign.action.submitting") : t("campaign.action.submit")}</button>
              </div>
            </form>
          )}
        </SupportModal>
      )}
    </>
  );
}
