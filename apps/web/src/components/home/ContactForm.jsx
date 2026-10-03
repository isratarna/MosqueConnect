import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { sendContactMessage } from "../../utils/communityHubApi";

const EMPTY = { name: "", email: "", message: "", website: "" };

export default function ContactForm() {
  const { user } = useAuth();
  const [values, setValues] = useState(EMPTY);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState(null); // { ok, text }
  const [errors, setErrors] = useState({});

  // Prefill name and email for logged-in users, without overwriting what they've typed.
  useEffect(() => {
    if (!user) return;
    setValues((current) => ({ ...current, name: current.name || user.name || "", email: current.email || user.email || "" }));
  }, [user]);

  // [Urmee · F5 Part 4] Controlled inputs with real <label>s (accessibility); 422 field errors are shown
  // next to each input.
  const bind = (field) => ({
    id: `contact-${field}`,
    name: field,
    value: values[field],
    onChange: (event) => setValues((current) => ({ ...current, [field]: event.target.value })),
  });
  const invalid = (field) => (errors[field] ? { "aria-invalid": "true", "aria-describedby": `contact-${field}-error` } : {});
  const fieldError = (field) => errors[field] && <div id={`contact-${field}-error`} className="invalid-feedback d-block">{errors[field][0]}</div>;

  const onSubmit = async (event) => {
    event.preventDefault();
    setSending(true);
    setNotice(null);
    setErrors({});
    try {
      const data = await sendContactMessage({ name: values.name.trim(), email: values.email.trim(), message: values.message.trim(), website: values.website });
      setValues((current) => ({ ...EMPTY, name: current.name, email: current.email }));
      setNotice({ ok: true, text: data.message || "Thanks! Your message has been sent." });
    } catch (error) {
      if (error.status === 422) {
        setErrors(error.errors || {});
        setNotice({ ok: false, text: "Please fix the highlighted fields." });
      } else if (error.status === 429) {
        // [Urmee · F5 Part 4] The API throttles contact messages (3 per 10 min), so 429 gets its own message.
        setNotice({ ok: false, text: "Too many messages, please try again later." });
      } else {
        setNotice({ ok: false, text: error.message });
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <div className="mb-3">
        <label className="form-label" htmlFor="contact-name">Your name</label>
        <input className="form-control" required maxLength={100} autoComplete="name" {...bind("name")} {...invalid("name")} />
        {fieldError("name")}
      </div>
      <div className="mb-3">
        <label className="form-label" htmlFor="contact-email">Your email</label>
        <input type="email" className="form-control" required maxLength={255} autoComplete="email" {...bind("email")} {...invalid("email")} />
        {fieldError("email")}
      </div>
      <div className="mb-3">
        <label className="form-label" htmlFor="contact-message">Your message</label>
        <textarea className="form-control" rows="3" required minLength={10} maxLength={3000} {...bind("message")} {...invalid("message")} />
        {fieldError("message")}
      </div>
      {/* Honeypot: hidden from people; bots that fill it in are rejected. */}
      <div className="mc-honeypot" aria-hidden="true">
        <label htmlFor="contact-website">Website</label>
        <input tabIndex={-1} autoComplete="off" {...bind("website")} />
      </div>
      {notice && <div className={`alert ${notice.ok ? "alert-success" : "alert-danger"} py-2 small`} role={notice.ok ? "status" : "alert"}>{notice.text}</div>}
      <button className="btn btn-mc w-100" type="submit" disabled={sending}>{sending ? "Sending…" : "Send message"}</button>
    </form>
  );
}
