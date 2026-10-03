import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, Check, CheckCircle, Copy, Droplet, Heart, MapPin, MessageCircle, Phone, Share2, TriangleAlert, UsersRound } from "lucide-react";
import ConfirmDialog from "../components/ConfirmDialog";
import RespondDialog from "../components/blood/RespondDialog";
import { PageSkeleton } from "../components/skeletons";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../utils/api";
import { normalizeBloodRequest, shareOnWhatsAppUrl, telHref, whatsappChatUrl } from "../utils/bloodRequest";
import { useLocale } from "../hooks/useLocale";
import { statusLabel } from "../utils/labels";

// [Urmee · i18n pages] Status names come from bloodDetail.status.<status>; dates follow the active language.
const STATUS_KEYS = ["active", "completed", "closed", "cancelled", "expired"];
const formatTime = (value, locale) => (value ? new Date(value).toLocaleString(locale === "en-BD" ? "en-GB" : locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "");

/**
 * [Urmee · F6 Part 1] /blood-donation/:id — one blood request: facts, call and WhatsApp buttons, share,
 * respond with a message. The person who posted it also sees who offered to donate and can mark it
 * fulfilled or cancel it (each with a confirmation). Only contact_phone is ever shown as the request's number.
 */
export default function BloodRequestDetail() {
  const { t, locale } = useLocale();
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [state, setState] = useState({ status: "loading", error: "" });
  const [respondOpen, setRespondOpen] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(async (signal) => {
    try {
      const { data } = await apiRequest(`/api/blood-requests/${id}`, { signal });
      setRequest(normalizeBloodRequest(data));
      setState({ status: "done", error: "" });
    } catch (error) {
      if (error.name !== "AbortError") setState({ status: error.status === 404 ? "missing" : "error", error: error.message });
    }
  }, [id]);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading", error: "" });
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  useEffect(() => { document.title = request ? t("bloodDetail.pageTitle", { group: request.blood_group }) : t("bloodDetail.pageTitleDefault"); }, [request, t]);

  if (state.status === "loading") return <PageSkeleton label={t("bloodDetail.loading")} />;
  if (state.status !== "done" || !request) {
    return (
      <div className="container py-5 text-center mc-page-narrow">
        <TriangleAlert size={42} className="text-warning" aria-hidden="true" />
        <h1 className="h4 mt-3">{state.status === "missing" ? t("bloodDetail.missingTitle") : t("bloodDetail.errorTitle")}</h1>
        <p className="text-muted">{state.status === "missing" ? t("bloodDetail.missingBody") : state.error}</p>
        <Link to="/blood-donation" className="btn btn-mc"><ArrowLeft size={16} aria-hidden="true" /> {t("bloodDetail.all")}</Link>
      </div>
    );
  }

  // [Urmee · F6 Part 1] The responder list and the fulfil/cancel buttons are only drawn for the person
  // who posted the request.
  const isOwner = Boolean(user) && Number(request.created_by) === Number(user.id);
  const responses = Array.isArray(request.responses) ? request.responses : [];
  // [Urmee · F6 Part 1] The detail response lists every response, so we can tell whether this user
  // already offered.
  const hasResponded = Boolean(user) && responses.some((response) => Number(response.user_id) === Number(user.id));
  const link = window.location.href;
  const whatsappChat = whatsappChatUrl(request.phone);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  // [Urmee · F6 Part 1] PATCH …/status: "completed" = fulfilled, "cancelled" = cancelled. A closed
  // request can't be reopened (the API refuses).
  const setStatus = (status) => async () => {
    await apiRequest(`/api/blood-requests/${request.id}/status`, { method: "PATCH", body: { status } });
    setNotice(status === "completed" ? t("bloodDetail.fulfilledNotice") : t("bloodDetail.cancelledNotice"));
    await load();
  };

  return (
    <div className="container py-4 py-lg-5 mc-page-narrow">
      <Link to="/blood-donation" className="small text-mc text-decoration-none d-inline-flex align-items-center gap-1 mb-3"><ArrowLeft size={14} aria-hidden="true" /> {t("bloodDetail.all")}</Link>
      {notice && <div className="alert alert-success" role="status">{notice}</div>}

      <article className={`card border-0 shadow-sm ${request.urgent && request.isOpen ? "border-start border-4 border-danger" : ""}`}>
        <div className="card-body p-4">
          <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
            <div className="d-flex align-items-center justify-content-center bg-danger-subtle text-danger fw-bold rounded-circle" style={{ width: 72, height: 72, fontSize: "1.5rem" }} aria-label={t("bloodDetail.groupAria", { group: request.group })}>{request.group}</div>
            <div>
              <h1 className="h4 mb-1">{t("bloodDetail.needed", { count: request.units || 1, group: request.group })}</h1>
              <div className="d-flex flex-wrap gap-2">
                {request.urgent && <span className="badge bg-danger">{t(`urgency.${request.urgency}`, { defaultValue: request.urgency })}</span>}
                <span className={`badge ${request.isOpen ? "bg-success" : "bg-secondary"}`}>{STATUS_KEYS.includes(request.status) ? t(`bloodDetail.status.${request.status}`) : statusLabel(t, request.status)}</span>
                <span className="badge text-bg-light border"><UsersRound size={12} aria-hidden="true" /> {t("bloodDetail.offers", { count: responses.length })}</span>
              </div>
            </div>
          </div>

          <ul className="list-unstyled d-grid gap-2 mb-3">
            <li><MapPin size={16} className="text-mc me-2" aria-hidden="true" />{request.hospital} <a className="small ms-1" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(request.hospital)}`} target="_blank" rel="noopener noreferrer">{t("bloodDetail.openInMaps")}</a></li>
            <li><Calendar size={16} className="text-mc me-2" aria-hidden="true" />{t("bloodDetail.neededBy")} <strong>{request.date}</strong></li>
            {request.contact_name && <li>{t("bloodDetail.contact", { name: request.contact_name })}</li>}
          </ul>
          {request.details && <p className="mc-prewrap border-start border-2 ps-3 text-muted">{request.details}</p>}

          {request.isOpen && request.phone && (
            <div className="d-flex flex-wrap gap-2 mb-3">
              <a href={telHref(request.phone)} className="btn btn-mc btn-sm"><Phone size={15} aria-hidden="true" /> {t("bloodDetail.call", { phone: request.phone })}</a>
              {whatsappChat && <a href={whatsappChat} target="_blank" rel="noopener noreferrer" className="btn btn-outline-success btn-sm"><MessageCircle size={15} aria-hidden="true" /> {t("bloodDetail.whatsapp")}</a>}
            </div>
          )}

          <div className="d-flex flex-wrap gap-2 align-items-center border-top pt-3">
            {request.isOpen && !isOwner && (hasResponded
              ? <span className="text-success fw-semibold"><CheckCircle size={16} aria-hidden="true" /> {t("bloodDetail.youOffered")}</span>
              : <button type="button" className="btn btn-mc btn-sm" onClick={() => (user ? setRespondOpen(true) : navigate("/login", { state: { from: `/blood-donation/${request.id}` } }))}><Heart size={15} aria-hidden="true" /> {t("bloodDetail.canDonate")}</button>)}
            <a href={shareOnWhatsAppUrl(request, link)} target="_blank" rel="noopener noreferrer" className="btn btn-outline-success btn-sm"><Share2 size={15} aria-hidden="true" /> {t("bloodDetail.shareWhatsapp")}</a>
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={copyLink}>{copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />} {copied ? t("bloodDetail.linkCopied") : t("bloodDetail.copyLink")}</button>
          </div>
        </div>
      </article>

      {isOwner && (
        <section className="card border-0 shadow-sm mt-4" aria-labelledby="responders-title">
          <div className="card-body p-4">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
              <h2 id="responders-title" className="h5 mb-0"><Droplet size={18} className="text-danger me-2" aria-hidden="true" />{t("bloodDetail.responders")}</h2>
              {request.isOpen && (
                <div className="d-flex gap-2">
                  <button type="button" className="btn btn-sm btn-success" onClick={() => setConfirm({ title: t("bloodDetail.fulfilTitle"), message: t("bloodDetail.fulfilMessage"), confirmLabel: t("bloodDetail.fulfilConfirm"), tone: "success", run: setStatus("completed") })}>{t("bloodDetail.fulfilConfirm")}</button>
                  <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setConfirm({ title: t("bloodDetail.cancelTitle"), message: t("bloodDetail.cancelMessage"), confirmLabel: t("bloodDetail.cancelConfirm"), tone: "danger", run: setStatus("cancelled") })}>{t("bloodDetail.cancelConfirm")}</button>
                </div>
              )}
            </div>
            {responses.length === 0 && <p className="text-muted mb-0">{t("bloodDetail.noOffers")}</p>}
            <ul className="list-unstyled d-grid gap-3 mb-0">
              {responses.map((response) => {
                const phone = response.respondent?.phone;
                const chat = whatsappChatUrl(phone);
                return (
                  <li key={response.id} className="border rounded p-3">
                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                      <strong>{response.respondent?.name || t("bloodDetail.donor")}</strong>
                      <small className="text-muted">{formatTime(response.created_at, locale)}</small>
                    </div>
                    {response.message && <p className="mc-prewrap mb-2 mt-1">{response.message}</p>}
                    {phone && (
                      <div className="d-flex gap-2">
                        <a className="btn btn-sm btn-mc" href={telHref(phone)}><Phone size={14} aria-hidden="true" /> {t("bloodDetail.callShort")}</a>
                        {chat && <a className="btn btn-sm btn-outline-success" href={chat} target="_blank" rel="noopener noreferrer"><MessageCircle size={14} aria-hidden="true" /> {t("bloodDetail.whatsapp")}</a>}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      {respondOpen && <RespondDialog request={request} onDone={() => load()} onClose={() => setRespondOpen(false)} />}
      {confirm && <ConfirmDialog title={confirm.title} message={confirm.message} confirmLabel={confirm.confirmLabel} tone={confirm.tone} onConfirm={confirm.run} onClose={() => setConfirm(null)} />}
    </div>
  );
}
