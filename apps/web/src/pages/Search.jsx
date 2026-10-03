import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, LoaderCircle, SearchX } from "lucide-react";

import GlobalSearch from "../components/GlobalSearch";
import { searchGlobal } from "../utils/searchApi";
import { isSearchable, MIN_QUERY_LENGTH, SEARCH_GROUPS } from "../utils/searchGroups";

export default function Search() {
  const [searchParams] = useSearchParams();
  const query = (searchParams.get("q") || "").trim();
  const [state, setState] = useState({ status: "idle", data: null, error: "" });
  const [activeKey, setActiveKey] = useState(SEARCH_GROUPS[0].key);

  useEffect(() => {
    if (!isSearchable(query)) {
      setState({ status: "idle", data: null, error: "" });
      return undefined;
    }

    const controller = new AbortController();
    setState((current) => ({ ...current, status: "loading", error: "" }));
    searchGlobal(query, { signal: controller.signal })
      .then((payload) => {
        const data = payload.data || {};
        setState({ status: "done", data, error: "" });
        // Open on the first tab that has something to show.
        const firstWithHits = SEARCH_GROUPS.find((group) => (data[group.key]?.total ?? 0) > 0);
        setActiveKey((firstWithHits ?? SEARCH_GROUPS[0]).key);
      })
      .catch((error) => {
        if (error.name !== "AbortError") setState({ status: "error", data: null, error: error.message || "Search failed." });
      });
    return () => controller.abort();
  }, [query]);

  useEffect(() => {
    document.title = query ? `Search: ${query} · MosqueConnect` : "Search · MosqueConnect";
  }, [query]);

  const groups = SEARCH_GROUPS.map((group) => ({
    ...group,
    total: state.data?.[group.key]?.total ?? 0,
    items: state.data?.[group.key]?.items ?? [],
  }));
  const grandTotal = groups.reduce((sum, group) => sum + group.total, 0);
  const active = groups.find((group) => group.key === activeKey) ?? groups[0];

  return (
    <section className="mc-search-page mc-atmospheric-section">
      <div className="container py-5">
        <header className="mc-search-page__intro">
          <p className="mc-kicker">Search</p>
          <h1>{query ? <>Results for “{query}”</> : "Search MosqueConnect"}</h1>
          <GlobalSearch key={query} variant="page" initialValue={query} />
        </header>

        {state.status === "idle" && (
          <div className="mc-search-page__empty">
            <SearchX size={36} aria-hidden="true" />
            <h2>{query ? "Keep typing" : "What are you looking for?"}</h2>
            <p>Enter at least {MIN_QUERY_LENGTH} characters to search mosques, events, campaigns, announcements and volunteering.</p>
          </div>
        )}

        {state.status === "loading" && (
          <div className="mc-search-page__empty" role="status">
            <LoaderCircle size={30} className="mc-search__spinner" aria-hidden="true" />
            <p>Searching…</p>
          </div>
        )}

        {state.status === "error" && (
          <div className="alert alert-danger" role="alert">{state.error}</div>
        )}

        {state.status === "done" && grandTotal === 0 && (
          <div className="mc-search-page__empty">
            <SearchX size={36} aria-hidden="true" />
            <h2>No results for “{query}”</h2>
            <p>Check the spelling, try fewer words, or browse instead.</p>
            <div className="d-flex flex-wrap justify-content-center gap-2">
              <Link className="btn btn-outline-mc btn-sm" to="/browse">Browse mosques</Link>
              <Link className="btn btn-outline-mc btn-sm" to="/community">Community updates</Link>
              <Link className="btn btn-outline-mc btn-sm" to="/campaigns">Campaigns</Link>
            </div>
          </div>
        )}

        {state.status === "done" && grandTotal > 0 && (
          <>
            <div className="mc-search-tabs" role="tablist" aria-label="Result types">
              {groups.map((group) => (
                <button
                  key={group.key}
                  type="button"
                  role="tab"
                  id={`search-tab-${group.key}`}
                  aria-selected={group.key === active.key}
                  aria-controls="search-tabpanel"
                  className={`mc-search-tabs__tab${group.key === active.key ? " is-active" : ""}`}
                  onClick={() => setActiveKey(group.key)}
                >
                  {group.label}
                  <span className="mc-search-tabs__count">{group.total}</span>
                </button>
              ))}
            </div>

            <div id="search-tabpanel" role="tabpanel" aria-labelledby={`search-tab-${active.key}`} className="mc-search-results">
              {active.items.length === 0 ? (
                <p className="text-muted mb-0">No {active.label.toLowerCase()} match “{query}”.</p>
              ) : (
                <>
                  <ul className="mc-search-results__list">
                    {active.items.map((item) => (
                      <li key={`${item.type}-${item.id}`}>
                        <Link to={item.url} className="mc-search-results__item">
                          <span className="mc-search-results__title">{item.title}</span>
                          {item.subtitle && <span className="mc-search-results__subtitle">{item.subtitle}</span>}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <Link to={active.seeAll(query)} className="mc-search-results__all">
                    See all {active.total} {active.label.toLowerCase()} <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
