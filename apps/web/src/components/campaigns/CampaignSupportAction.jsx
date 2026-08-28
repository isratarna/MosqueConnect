import { useState } from "react";
import { HeartHandshake } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { submitCampaignDonation } from "../../utils/campaignApi";
import SupportModal from "../SupportModal";

const INITIAL = { donor_name: "", contact: "", amount: "", payment_method: "mobile_banking", reference: "", message: "", is_anonymous: false };

export default function CampaignSupportAction({ campaign }) {
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
      setSuccess(payload.message || "Your support was submitted for confirmation.");
      setValues(INITIAL);
    } catch (requestError) {
      setError(requestError.message || "Your support could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!campaign.accepts_donations) return <button className="btn btn-secondary w-100" disabled>Campaign closed</button>;
  if (!user) return <Link className="btn btn-mc w-100" to="/login"><HeartHandshake size={17} /> Sign in to support</Link>;

  return (
    <>
      <button type="button" className="btn btn-mc w-100" onClick={() => { setOpen(true); setSuccess(""); }}>
        <HeartHandshake size={17} /> Support this campaign
      </button>
      {open && (
        <SupportModal title={`Support ${campaign.title}`} description="Submit a manual donation record. The mosque will verify it before adding it to the amount raised." onClose={() => setOpen(false)}>
          {success ? (
            <div className="mc-campaign-support-success" role="status">
              <HeartHandshake size={38} aria-hidden="true" />
              <h3>Thank you for your support</h3>
              <p>{success}</p>
              <button className="btn btn-mc" type="button" onClick={() => setOpen(false)}>Done</button>
            </div>
          ) : (
            <form className="mc-campaign-support-form" onSubmit={submit}>
              {error && <div className="alert alert-danger" role="alert">{error}</div>}
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label" htmlFor="campaign-donor-name">Donor name</label>
                  <input id="campaign-donor-name" className="form-control" value={values.donor_name} onChange={setValue("donor_name")} required={!values.is_anonymous} disabled={values.is_anonymous} />
                </div>
                <div className="col-md-6">
                  <label className="form-label" htmlFor="campaign-contact">Contact</label>
                  <input id="campaign-contact" className="form-control" value={values.contact} onChange={setValue("contact")} required />
                </div>
                <div className="col-md-6">
                  <label className="form-label" htmlFor="campaign-amount">Amount (BDT)</label>
                  <input id="campaign-amount" type="number" min="1" step="0.01" className="form-control" value={values.amount} onChange={setValue("amount")} required />
                </div>
                <div className="col-md-6">
                  <label className="form-label" htmlFor="campaign-method">Manual method</label>
                  <select id="campaign-method" className="form-select" value={values.payment_method} onChange={setValue("payment_method")} required>
                    <option value="mobile_banking">Mobile banking</option>
                    <option value="bank_transfer">Bank transfer</option>
                    <option value="cash">Cash</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="col-12">
                  <label className="form-label" htmlFor="campaign-reference">Transaction/reference <span className="text-muted">(optional)</span></label>
                  <input id="campaign-reference" className="form-control" value={values.reference} onChange={setValue("reference")} />
                </div>
                <div className="col-12">
                  <label className="form-label" htmlFor="campaign-message">Message <span className="text-muted">(optional)</span></label>
                  <textarea id="campaign-message" className="form-control" rows="3" value={values.message} onChange={setValue("message")} />
                </div>
                <div className="col-12 form-check ms-2">
                  <input id="campaign-anonymous" type="checkbox" className="form-check-input" checked={values.is_anonymous} onChange={setValue("is_anonymous")} />
                  <label className="form-check-label" htmlFor="campaign-anonymous">Show my support as anonymous</label>
                </div>
              </div>
              <p className="form-text mt-3">No online payment is processed. Only submit after arranging the transfer directly with the mosque.</p>
              <div className="d-flex justify-content-end gap-2 mt-4">
                <button className="btn btn-outline-mc" type="button" onClick={() => setOpen(false)}>Cancel</button>
                <button className="btn btn-mc" type="submit" disabled={submitting}>{submitting ? "Submitting..." : "Submit for confirmation"}</button>
              </div>
            </form>
          )}
        </SupportModal>
      )}
    </>
  );
}
