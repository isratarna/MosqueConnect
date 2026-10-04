import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import Modal from "../Modal";
import { useAuth } from "../../context/AuthContext";
import { GOODS_CONDITIONS, GOODS_DELIVERY_METHODS, hubLabelT, pledgeGoods } from "../../utils/communityHubApi";
import { useLocale } from "../../hooks/useLocale";

const today = () => new Date().toISOString().slice(0, 10);

/** Pledge goods (food, clothes, prayer mats…) to one mosque. */
export default function GoodsPledgeForm({ mosque, onClose }) {
  const { t } = useLocale(); // [Urmee · i18n community]
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
    <Modal title={t("goodsForm.title", { mosque: mosque.name })} onClose={onClose} busy={busy}>
      {!user ? (
        <div className="text-center py-2">
          <p>{t("goodsForm.signIn")}</p>
          <Link className="btn btn-mc" to="/login" state={{ from: location.pathname }}>{t("complaintForm.signInButton")}</Link>
        </div>
      ) : sent ? (
        <div className="text-center py-2" role="status">
          <CheckCircle2 size={40} className="text-success mb-2" aria-hidden="true" />
          <p className="fw-semibold mb-1">{t("goodsForm.thanks")}</p>
          <p className="small text-muted">{t("goodsForm.followUp")} <Link to="/profile?tab=donations">{t("goodsForm.followLink")}</Link>.</p>
          <button type="button" className="btn btn-outline-mc" onClick={onClose}>{t("complaintForm.close")}</button>
        </div>
      ) : (
        <form onSubmit={submit}>
          <div className="row g-2 mb-3">
            <div className="col-sm-8">
              <label className="form-label" htmlFor="goods-item">{t("goodsForm.item")}</label>
              <input id="goods-item" name="item_name" className="form-control" required maxLength={255} placeholder={t("goodsForm.itemPlaceholder")} />
            </div>
            <div className="col-sm-4">
              <label className="form-label" htmlFor="goods-quantity">{t("goodsForm.quantity")}</label>
              <input id="goods-quantity" name="quantity" className="form-control" required maxLength={50} placeholder={t("goodsForm.quantityPlaceholder")} />
            </div>
          </div>
          <div className="row g-2 mb-3">
            <div className="col-sm-6">
              <label className="form-label" htmlFor="goods-condition">{t("goodsForm.condition")}</label>
              <select id="goods-condition" name="condition" className="form-select" required defaultValue="">
                <option value="" disabled>{t("goodsForm.chooseCondition")}</option>
                {GOODS_CONDITIONS.map(([value]) => <option key={value} value={value}>{hubLabelT(t, "goodsCondition", value)}</option>)}
              </select>
            </div>
            <div className="col-sm-6">
              <label className="form-label" htmlFor="goods-date">{t("goodsForm.date")}</label>
              <input id="goods-date" name="preferred_date" type="date" className="form-control" min={today()} />
            </div>
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="goods-delivery">{t("goodsForm.delivery")}</label>
            <select id="goods-delivery" name="delivery_method" className="form-select" required defaultValue="">
              <option value="" disabled>{t("goodsForm.chooseDelivery")}</option>
              {GOODS_DELIVERY_METHODS.map(([value]) => <option key={value} value={value}>{hubLabelT(t, "deliveryMethod", value)}</option>)}
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="goods-contact">{t("goodsForm.contact")}</label>
            <input id="goods-contact" name="contact" className="form-control" required maxLength={255} defaultValue={user.phone || ""} placeholder={t("goodsForm.contactPlaceholder")} />
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="goods-notes">{t("goodsForm.notes")}</label>
            <textarea id="goods-notes" name="notes" className="form-control" rows={2} maxLength={2000} placeholder={t("goodsForm.notesPlaceholder")} />
          </div>
          {error && <div className="alert alert-danger py-2 small" role="alert">{error}</div>}
          <div className="d-flex justify-content-end gap-2">
            <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={busy}>{t("common.cancel")}</button>
            <button type="submit" className="btn btn-mc" disabled={busy}>{busy ? t("complaintForm.sending") : t("goodsForm.send")}</button>
          </div>
        </form>
      )}
    </Modal>
  );
}
