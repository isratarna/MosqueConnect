import { useEffect, useId, useRef, useState } from "react";
import { LoaderCircle, Search, X } from "lucide-react";
import { apiRequest } from "../utils/api";
import VerifiedBadge from "./VerifiedBadge";

const DEBOUNCE_MS = 300;
const MIN_LENGTH = 2;

/**
 * [Urmee · F3 Part 3] Searchable mosque picker (combobox): type a name or area and pick from the results.
 * Searches the whole country through GET /api/mosques?search= (300 ms debounce), so it works even when
 * location is denied. Mosques that already have an administrator are listed as "Already managed" and can't be chosen.
 * Keyboard: ↑ ↓ move, Enter picks, Esc closes. Reused by the claim page and the support flow.
 */
export default function MosquePicker({ value, onChange, label = "Mosque", required = false, disableManaged = true, autoFocus = false }) {
  const inputId = useId();
  const listId = `${inputId}-list`;
  const wrapperRef = useRef(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [state, setState] = useState({ status: "idle", results: [], error: "" });
  const [active, setActive] = useState(-1);

  // Debounced search; cleanup aborts the previous request so a slow answer can't overwrite a newer one.
  useEffect(() => {
    const term = query.trim();
    if (term.length < MIN_LENGTH) {
      setState({ status: "idle", results: [], error: "" });
      return undefined;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setState((current) => ({ ...current, status: "loading", error: "" }));
      apiRequest(`/api/mosques?search=${encodeURIComponent(term)}&per_page=8`, { signal: controller.signal })
        .then(({ data }) => setState({ status: "done", results: data || [], error: "" }))
        .catch((error) => { if (error.name !== "AbortError") setState({ status: "error", results: [], error: error.message }); });
    }, DEBOUNCE_MS);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);

  useEffect(() => setActive(-1), [state.results]);

  // Click outside closes the list.
  useEffect(() => {
    const onDown = (event) => { if (!wrapperRef.current?.contains(event.target)) setOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // [Urmee · F3 Part 3] Mosques that already have an administrator are shown as "Already managed" and
  // can't be chosen on the claim page.
  const isBlocked = (mosque) => disableManaged && mosque.has_admin;
  const choose = (mosque) => {
    if (isBlocked(mosque)) return;
    onChange(mosque);
    setQuery("");
    setOpen(false);
  };

  // [Urmee · F3 Part 3] Arrow keys skip disabled ("Already managed") options.
  const move = (step) => {
    const { results } = state;
    if (!results.length) return;
    let next = active;
    for (let i = 0; i < results.length; i += 1) {
      next = (next + step + results.length) % results.length;
      if (!isBlocked(results[next])) break;
    }
    setActive(next);
  };

  const onKeyDown = (event) => {
    if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); move(1); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setOpen(true); move(-1); }
    else if (event.key === "Enter" && open && active >= 0) { event.preventDefault(); choose(state.results[active]); }
    else if (event.key === "Escape") setOpen(false);
  };

  const term = query.trim();
  const showList = open && term.length >= MIN_LENGTH;

  if (value) {
    return (
      <div>
        <span className="form-label fw-semibold d-block">{label}{required && <span className="text-danger"> *</span>}</span>
        <div className="d-flex align-items-center justify-content-between gap-2 border rounded p-2">
          <span>
            <strong>{value.name}</strong>{(value.verified || value.verification_status === "verified") && <VerifiedBadge className="ms-1" />}
            <span className="d-block small text-muted">{[value.area, value.district].filter(Boolean).join(", ") || value.address}</span>
          </span>
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => onChange(null)} aria-label="Choose a different mosque"><X size={14} aria-hidden="true" /> Change</button>
        </div>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="position-relative">
      <label className="form-label fw-semibold" htmlFor={inputId}>{label}{required && <span className="text-danger"> *</span>}</label>
      <div className="input-group">
        <span className="input-group-text"><Search size={16} aria-hidden="true" /></span>
        <input
          id={inputId}
          type="text"
          className="form-control"
          placeholder="Search by mosque name or area…"
          autoComplete="off"
          autoFocus={autoFocus}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          value={query}
          onChange={(event) => { setQuery(event.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        {state.status === "loading" && <span className="input-group-text"><LoaderCircle size={16} className="spin" aria-hidden="true" /></span>}
      </div>

      <ul id={listId} role="listbox" aria-label="Matching mosques" className="mc-picker__list list-unstyled" hidden={!showList}>
        {state.status === "error" && <li className="p-2 small text-danger" role="alert">{state.error}</li>}
        {state.status === "done" && state.results.length === 0 && <li className="p-2 small text-muted" role="status">No mosque found for “{term}”.</li>}
        {state.results.map((mosque, index) => {
          const blocked = isBlocked(mosque);
          return (
            <li
              key={mosque.id}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === active}
              aria-disabled={blocked || undefined}
              className={`mc-picker__option${index === active ? " is-active" : ""}${blocked ? " is-disabled" : ""}`}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => !blocked && setActive(index)}
              onClick={() => choose(mosque)}
            >
              <strong>{mosque.name}</strong>
              {(mosque.verified || mosque.verification_status === "verified") && <VerifiedBadge className="ms-1" />}
              {blocked && <span className="badge text-bg-secondary ms-2">Already managed</span>}
              <span className="d-block small text-muted">{[mosque.area, mosque.district].filter(Boolean).join(", ") || mosque.address}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
