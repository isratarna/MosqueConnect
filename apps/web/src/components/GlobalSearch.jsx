import { forwardRef, useCallback, useEffect, useId, useImperativeHandle, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Clock3, HandHeart, Heart, Landmark, LoaderCircle, Megaphone, Search, X } from "lucide-react";

import { clearRecent, readRecent, saveRecent } from "../utils/recentSearches";
import { searchGlobal } from "../utils/searchApi";
import { isSearchable, MIN_QUERY_LENGTH, nonEmptyGroups, searchPath } from "../utils/searchGroups";

// [Urmee · F5 Part 2] Wait 300 ms after the last keystroke before calling GET /api/search.
const DEBOUNCE_MS = 300;

const TYPE_ICONS = {
  mosque: Landmark,
  event: CalendarDays,
  campaign: Heart,
  announcement: Megaphone,
  volunteer_opportunity: HandHeart,
};

/**
 * Search box with grouped suggestions, recent searches and keyboard navigation.
 *
 * - The input is controlled by `value`, which changes on every keystroke; only the
 *   network request is debounced (a separate effect), so typing never waits.
 * - The dropdown is closed by Escape, by choosing something, or by a mousedown
 *   outside `wrapperRef`. There is deliberately no onBlur: it fires before a click
 *   on a suggestion lands, which is what used to close the list early.
 * - Options use onMouseDown preventDefault so clicking one never moves focus.
 *
 * State (value, open, results) is local to each instance; nothing is shared between boxes.
 * `onDismiss` lets a parent (the navbar) hide itself when the box is dismissed.
 */
const GlobalSearch = forwardRef(function GlobalSearch(
  { id, initialValue = "", placeholder = "Search mosques, events, campaigns…", autoFocus = false, variant = "nav", onDismiss },
  ref,
) {
  const navigate = useNavigate();
  // Every instance gets its own ids (pass `id` to name them, otherwise one is generated),
  // so two boxes on a page never share an element id.
  const generatedId = useId();
  const inputId = id || `search${generatedId}`;
  const listId = `${inputId}-list`;
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  const [value, setValue] = useState(initialValue);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recent, setRecent] = useState(() => readRecent());
  // `term` is the query the data belongs to, so stale results are never shown for a newer query.
  const [result, setResult] = useState({ status: "idle", term: "", data: null });

  useImperativeHandle(ref, () => ({
    focus: () => { inputRef.current?.focus(); inputRef.current?.select(); setOpen(true); },
  }), []);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  // Debounced request. Cleanup cancels the timer and aborts an in-flight request,
  // so a slow response to an old query can't overwrite a newer one.
  useEffect(() => {
    const term = value.trim();
    if (!isSearchable(term)) {
      setResult({ status: "idle", term: "", data: null });
      return undefined;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      setResult((current) => ({ ...current, status: "loading", term }));
      searchGlobal(term, { signal: controller.signal })
        .then((payload) => setResult({ status: "done", term, data: payload.data }))
        .catch((error) => {
          if (error.name !== "AbortError") setResult({ status: "error", term, data: null });
        });
    }, DEBOUNCE_MS);

    return () => { clearTimeout(timer); controller.abort(); };
  }, [value]);

  // Click outside closes. mousedown (not click) so it happens before focus moves.
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      const wrapper = wrapperRef.current;
      // composedPath still lists the wrapper when the clicked node was swapped out by a re-render mid-click.
      const inside = wrapper && (event.composedPath().includes(wrapper) || !event.target.isConnected);
      if (wrapper && !inside) {
        setOpen(false);
        onDismiss?.();
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open, onDismiss]);

  const term = value.trim();
  const fresh = result.status === "done" && result.term === term;
  const groups = useMemo(() => (fresh ? nonEmptyGroups(result.data) : []), [fresh, result.data]);
  const hasHits = groups.length > 0;
  const showRecent = term.length === 0 && recent.length > 0;

  // One flat list drives the arrow keys; rows render from it.
  const options = useMemo(() => {
    if (showRecent) return recent.map((query) => ({ kind: "recent", query }));
    if (!hasHits) return [];
    return [
      ...groups.flatMap((group) => group.items.map((item) => ({ kind: "item", item }))),
      { kind: "all", query: term },
    ];
  }, [groups, hasHits, recent, showRecent, term]);

  useEffect(() => { setActiveIndex(-1); }, [options]);

  const finish = useCallback(() => {
    setOpen(false);
    onDismiss?.();
  }, [onDismiss]);

  const rememberIfFound = () => {
    if (hasHits) setRecent(saveRecent(term));
  };

  const choose = (option) => {
    if (option.kind === "recent") {
      setValue(option.query);
      setRecent(saveRecent(option.query));
      navigate(searchPath(option.query));
    } else if (option.kind === "item") {
      rememberIfFound();
      navigate(option.item.url);
    } else {
      rememberIfFound();
      navigate(searchPath(option.query));
    }
    finish();
  };

  const submit = () => {
    if (!isSearchable(term)) return;
    rememberIfFound();
    navigate(searchPath(term));
    finish();
  };

  const onKeyDown = (event) => {
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp": {
        if (options.length === 0) return;
        event.preventDefault();
        setOpen(true);
        const step = event.key === "ArrowDown" ? 1 : -1;
        setActiveIndex((index) => (index === -1
          ? (step === 1 ? 0 : options.length - 1)
          : (index + step + options.length) % options.length));
        break;
      }
      case "Enter":
        event.preventDefault();
        if (activeIndex >= 0 && options[activeIndex]) choose(options[activeIndex]);
        else submit();
        break;
      case "Escape":
        event.preventDefault();
        finish();
        break;
      case "Tab":
        setOpen(false);
        break;
      default:
    }
  };

  const panelVisible = open && (showRecent || term.length > 0);
  let optionNumber = -1;
  const renderOption = (option, content) => {
    optionNumber += 1;
    const index = optionNumber;
    return (
      <div
        key={`${option.kind}-${option.item?.type ?? ""}-${option.item?.id ?? option.query}`}
        id={`${listId}-option-${index}`}
        role="option"
        aria-selected={index === activeIndex}
        className={`mc-search__option${index === activeIndex ? " is-active" : ""}`}
        onMouseDown={(event) => event.preventDefault()}
        onMouseEnter={() => setActiveIndex(index)}
        onClick={() => choose(option)}
      >
        {content}
      </div>
    );
  };

  const message = (() => {
    if (term.length === 0) return null;
    if (term.length < MIN_QUERY_LENGTH) return `Type at least ${MIN_QUERY_LENGTH} characters to search.`;
    if (result.status === "error") return "Search is unavailable right now. Press Enter to try the full search page.";
    if (!fresh) return "Searching…";
    if (!hasHits) return `No results for “${term}”.`;
    return null;
  })();

  return (
    <div ref={wrapperRef} className={`mc-search mc-search--${variant}`}>
      <form
        role="search"
        className="mc-search__field"
        onSubmit={(event) => { event.preventDefault(); }}
      >
        <Search size={17} aria-hidden="true" className="mc-search__icon" />
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          className="mc-search__input"
          value={value}
          placeholder={placeholder}
          aria-label="Search"
          role="combobox"
          aria-expanded={panelVisible}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined}
          autoComplete="off"
          spellCheck="false"
          maxLength={100}
          onChange={(event) => { setValue(event.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        {result.status === "loading" && term.length > 0 && <LoaderCircle size={16} className="mc-search__spinner" aria-hidden="true" />}
        {value && (
          <button
            type="button"
            className="mc-search__clear"
            aria-label="Clear search"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => { setValue(""); setOpen(true); inputRef.current?.focus(); }}
          >
            <X size={15} aria-hidden="true" />
          </button>
        )}
      </form>

      <div
        id={listId}
        role="listbox"
        aria-label="Search suggestions"
        className="mc-search__panel"
        hidden={!panelVisible}
      >
        {showRecent && (
          <div role="presentation">
            <div className="mc-search__heading" role="presentation">
              <span>Recent searches</span>
              <button
                type="button"
                className="mc-search__heading-action"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => { setRecent(clearRecent()); inputRef.current?.focus(); }}
              >
                Clear
              </button>
            </div>
            {options.map((option) => renderOption(option, (
              <>
                <Clock3 size={15} aria-hidden="true" />
                <span className="mc-search__title">{option.query}</span>
              </>
            )))}
          </div>
        )}

        {message && <div className="mc-search__message" role="status">{message}</div>}

        {hasHits && (
          <>
            {groups.map((group) => (
              <div key={group.key} role="presentation">
                <div className="mc-search__heading" role="presentation">
                  <span>{group.label}</span>
                  <span className="mc-search__count">{group.total}</span>
                </div>
                {group.items.map((item) => {
                  const Icon = TYPE_ICONS[item.type] ?? Search;
                  return renderOption({ kind: "item", item }, (
                    <>
                      <Icon size={15} aria-hidden="true" />
                      <span className="mc-search__text">
                        <span className="mc-search__title">{item.title}</span>
                        {item.subtitle && <span className="mc-search__subtitle">{item.subtitle}</span>}
                      </span>
                    </>
                  ));
                })}
              </div>
            ))}
            {renderOption({ kind: "all", query: term }, (
              <>
                <Search size={15} aria-hidden="true" />
                <span className="mc-search__title">See all results for “{term}”</span>
              </>
            ))}
          </>
        )}
      </div>
    </div>
  );
});

export default GlobalSearch;
