import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, LoaderCircle, SearchX } from "lucide-react";

import GlobalSearch from "../components/GlobalSearch";
import { searchGlobal } from "../utils/searchApi";
import { isSearchable, MIN_QUERY_LENGTH, SEARCH_GROUPS } from "../utils/searchGroups";
import { useLocale } from "../hooks/useLocale";
import { formatNumber } from "../utils/intl";

// [Urmee · F5 Part 2] /search?q= results page: one tab + count per type, "See all" links to the
// filtered list pages.
export default function Search() {
  const { t, locale } = useLocale(); // [Urmee · i18n shared] group names are looked up by key, text comes from the locale files
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
        if (error.name !== "AbortError") setState({ status: "error", data: null, error: error.message || t("search.failed") });
      });
    return () => controller.abort();
  }, [query]);

  useEffect(() => {
    document.title = query ? t("search.pageTitleQuery", { query }) : t("search.pageTitle");
  }, [query, t]);

  const groups = SEARCH_GROUPS.map((group) => ({
    ...group,
    label: t(`search.groups.${group.key}`),
    total: state.data?.[group.key]?.total ?? 0,
    items: state.data?.[group.key]?.items ?? [],
  }));
  const grandTotal = groups.reduce((sum, group) => sum + group.total, 0);
  const active = groups.find((group) => group.key === activeKey) ?? groups[0];

  return (
    <section className="mc-search-page mc-atmospheric-section">
      <div className="container py-5">
        <header className="mc-search-page__intro">
          <p className="mc-kicker">{t("search.kicker")}</p>
          <h1>{query ? t("search.resultsFor", { query }) : t("search.heading")}</h1>
          <GlobalSearch key={query} variant="page" initialValue={query} />
        </header>

        {state.status === "idle" && (
          <div className="mc-search-page__empty">
            <SearchX size={36} aria-hidden="true" />
            <h2>{query ? t("search.keepTyping") : t("search.whatLooking")}</h2>
            <p>{t("search.minChars", { count: MIN_QUERY_LENGTH })}</p>
          </div>
        )}

        {state.status === "loading" && (
          <div className="mc-search-page__empty" role="status">
            <LoaderCircle size={30} className="mc-search__spinner" aria-hidden="true" />
            <p>{t("search.searching")}</p>
          </div>
        )}

        {state.status === "error" && (
          <div className="alert alert-danger" role="alert">{state.error}</div>
        )}

        {state.status === "done" && grandTotal === 0 && (
          <div className="mc-search-page__empty">
            <SearchX size={36} aria-hidden="true" />
            <h2>{t("search.noResults", { query })}</h2>
            <p>{t("search.noResultsHelp")}</p>
            <div className="d-flex flex-wrap justify-content-center gap-2">
              <Link className="btn btn-outline-mc btn-sm" to="/browse">{t("search.browseMosques")}</Link>
              <Link className="btn btn-outline-mc btn-sm" to="/community">{t("search.communityUpdates")}</Link>
              <Link className="btn btn-outline-mc btn-sm" to="/campaigns">{t("search.campaigns")}</Link>
            </div>
          </div>
        )}

        {state.status === "done" && grandTotal > 0 && (
          <>
            <div className="mc-search-tabs" role="tablist" aria-label={t("search.resultTypes")}>
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
                  <span className="mc-search-tabs__count">{formatNumber(group.total, locale)}</span>
                </button>
              ))}
            </div>

            <div id="search-tabpanel" role="tabpanel" aria-labelledby={`search-tab-${active.key}`} className="mc-search-results">
              {active.items.length === 0 ? (
                <p className="text-muted mb-0">{t("search.noneInGroup", { group: active.label.toLowerCase(), query })}</p>
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
                    {t("search.seeAll", { count: active.total, group: active.label.toLowerCase() })} <ArrowRight size={15} aria-hidden="true" />
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
