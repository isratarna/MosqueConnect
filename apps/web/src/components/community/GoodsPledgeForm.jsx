import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import Modal from "../Modal";
import { useAuth } from "../../context/AuthContext";
import { GOODS_CONDITIONS, GOODS_DELIVERY_METHODS, pledgeGoods } from "../../utils/communityHubApi";

const today = () => new Date().toISOString().slice(0, 10);

/** Pledge goods (food, clothes, prayer mats…) to one mosque. */
export default function GoodsPledgeForm({ mosque, onClose }) {
  const { user } = useAuth();
  const location = useLocation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (key) => String(form.get(key) || "").trim();
    setBusy(true);
    setError("");
    try {
      await pledgeGoods(mosque.id, {
        item_name: value("item_name"),
        quantity: value("quantity"),
        condition: value("condition"),
        delivery_method: value("delivery_method"),
        preferred_date: value("preferred_date") || null,
        contact: value("contact"),
        notes: value("notes") || null,
      });
      setSent(true);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return (
    <Modal title={`Donate goods to ${mosque.name}`} onClose={onClose} busy={busy}>
      {!user ? (
        <div className="text-center py-2">
          <p>Please sign in so the mosque can contact you about your donation.</p>
          <Link className="btn btn-mc" to="/login" state={{ from: location.pathname }}>Sign in</Link>
        </div>
      ) : sent ? (
        <div className="text-center py-2" role="status">
          <CheckCircle2 size={40} className="text-success mb-2" aria-hidden="true" />
          <p className="fw-semibold mb-1">Jazakallah khair! Your pledge was sent.</p>
          <p className="small text-muted">The mosque will contact you. Follow it under <Link to="/profile?tab=donations">Profile → Donations</Link>.</p>
          <button type="button" className="btn btn-outline-mc" onClick={onClose}>Close</button>
        </div>
      ) : (
        <form onSubmit={submit}>
          <div className="row g-2 mb-3">
            <div className="col-sm-8">
              <label className="form-label" htmlFor="goods-item">Item</label>
              <input id="goods-item" name="item_name" className="form-control" required maxLength={255} placeholder="e.g. Prayer mats" />
            </div>
            <div className="col-sm-4">
              <label className="form-label" htmlFor="goods-quantity">Quantity</label>
              <input id="goods-quantity" name="quantity" className="form-control" required maxLength={50} placeholder="e.g. 10 pieces" />
            </div>
          </div>
          <div className="row g-2 mb-3">
            <div className="col-sm-6">
              <label className="form-label" htmlFor="goods-condition">Item condition</label>
              <select id="goods-condition" name="condition" className="form-select" required defaultValue="">
                <option value="" disabled>Choose item condition</option>
                {GOODS_CONDITIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            <div className="col-sm-6">
              <label className="form-label" htmlFor="goods-date">Preferred date (optional)</label>
              <input id="goods-date" name="preferred_date" type="date" className="form-control" min={today()} />
            </div>
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="goods-delivery">Delivery method</label>
            <select id="goods-delivery" name="delivery_method" className="form-select" required defaultValue="">
              <option value="" disabled>Choose a delivery method</option>
              {GOODS_DELIVERY_METHODS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="goods-contact">Contact</label>
            <input id="goods-contact" name="contact" className="form-control" required maxLength={255} defaultValue={user.phone || ""} placeholder="Phone number or email address" />
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="goods-notes">Notes (optional)</label>
            <textarea id="goods-notes" name="notes" className="form-control" rows={2} maxLength={2000} placeholder="Pickup address or anything the mosque should know" />
          </div>
          {error && <div className="alert alert-danger py-2 small" role="alert">{error}</div>}
          <div className="d-flex justify-content-end gap-2">
            <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={busy}>Cancel</button>
            <button type="submit" className="btn btn-mc" disabled={busy}>{busy ? "Sending…" : "Send pledge"}</button>
          </div>
        </form>
      )}
    </Modal>
  );
}
