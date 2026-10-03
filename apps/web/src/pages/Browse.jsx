import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { List as ListIcon, Map as MapIcon, MapPin, RefreshCw, Search, SlidersHorizontal, TriangleAlert } from "lucide-react";
import { useGeolocation, requestGeolocation } from "../hooks/useGeolocation";
import { FACILITY_META } from "../data/mosques";
import { useMosqueDiscovery } from "../hooks/useMosqueDiscovery";
import { DISCOVERY_RADIUS_KM, fetchMosquesInBounds, filterMosques } from "../utils/mosqueDiscovery";
import BrowseMapLayout from "../components/browse/BrowseMapLayout";
import FacilityIcon from "../components/FacilityIcon";
import MosqueCard from "../components/MosqueCard";
import { MosqueCardSkeleton, SkeletonRegion } from "../components/skeletons";

// [Urmee · F1 Part 1] Fixed batch of 12: replaces the "Results per page" dropdown and numbered
// pagination.
const BATCH_SIZE = 12;
const SKELETON_COUNT = 6;

export default function Browse() {
  const origin = useGeolocation();
  const discovery = useMosqueDiscovery(origin);
  const nearbyMosques = discovery.mosques;

  const [searchParams, setSearchParams] = useSearchParams();
  const urlSearch = searchParams.get("search") ?? "";

  const [search, setSearch] = useState(urlSearch);
  const [facilities, setFacilities] = useState(() => new Set((searchParams.get("facilities") || "").split(",").filter((key) => key in FACILITY_META)));
  const [maxDistance, setMaxDistance] = useState(null);
  const [sort, setSort] = useState("distance");
  const [view, setView] = useState(() => (searchParams.get("view") === "map" ? "map" : "list"));
  const [selectedDistrict, setSelectedDistrict] = useState(() => searchParams.get("district") || "");
  const [selectedArea, setSelectedArea] = useState(() => searchParams.get("area") || "");
  // "Search this area" results; null means the usual nearby mosques.
  // [Urmee · F2 Part 2] "Search this area" results replace the nearby list while active; null = normal
  // nearby mosques.
  const [areaState, setAreaState] = useState({ mosques: null, loading: false, error: "" });
  const all = areaState.mosques ?? nearbyMosques;
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const gridRef = useRef(null);
  const focusIndexRef = useRef(null);
  const sentinelRef = useRef(null);
  const [selectedMosqueId, setSelectedMosqueId] = useState(null);

  // Derive unique districts and areas from the mosque data.
  const locationOptions = useMemo(() => {
    const districtSet = new Set(all.map((m) => m.district).filter(Boolean));
    const districts = [...districtSet].sort();

    const areasByDistrict = {};
    for (const m of all) {
      if (!m.district || !m.area) continue;
      if (!areasByDistrict[m.district]) areasByDistrict[m.district] = new Set();
      areasByDistrict[m.district].add(m.area);
    }
    const areas = {};
    for (const [d, s] of Object.entries(areasByDistrict)) {
      areas[d] = [...s].sort();
    }

    return { districts, areas };
  }, [all]);

  // Reset area when district changes.
  const handleDistrictChange = (e) => {
    const newDistrict = e.target.value;
    setSelectedDistrict(newDistrict);
    setSelectedArea("");
  };

  const toggleFacility = (key) => {
    setFacilities((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // Pick up ?search= changes (e.g. arriving from the home page hero search).
  useEffect(() => {
    setSearch(urlSearch);
  }, [urlSearch]);

  // [Urmee · F2 Part 2] ?search=&facilities=&district=&area=&view=map so a filtered map view can be
  // shared.
  // Keep the shareable parts of the view in the URL: ?search=&facilities=a,b&district=&area=&view=map
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    const put = (key, value) => (value ? next.set(key, value) : next.delete(key));
    put("search", search);
    put("facilities", [...facilities].sort().join(","));
    put("district", selectedDistrict);
    put("area", selectedArea);
    put("view", view === "map" ? "map" : "");
    if (next.toString() !== searchParams.toString()) setSearchParams(next, { replace: true });
    // searchParams is only read to preserve unrelated keys
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, facilities, selectedDistrict, selectedArea, view]);

  // [Urmee · F2 Part 2] Calls GET /api/mosques?bounds=south,west,north,east for the visible map
  // rectangle.
  const searchArea = async (bounds) => {
    setAreaState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const mosques = await fetchMosquesInBounds(bounds, origin);
      setAreaState({ mosques, loading: false, error: "" });
    } catch (error) {
      setAreaState((current) => ({ ...current, loading: false, error: error.message }));
    }
  };
  const resetArea = () => setAreaState({ mosques: null, loading: false, error: "" });

  const clearFilters = () => {
    setSearch("");
    if (searchParams.has("search")) {
      const next = new URLSearchParams(searchParams);
      next.delete("search");
      setSearchParams(next, { replace: true });
    }
    setFacilities(new Set());
    setMaxDistance(null);
    setSort("distance");
    setSelectedDistrict("");
    setSelectedArea("");
  };

  const clearLocation = () => {
    setSelectedDistrict("");
    setSelectedArea("");
  };

  const results = useMemo(() => {
    return filterMosques(all, {
      search,
      facilities,
      maxDistance,
      district: selectedDistrict,
      area: selectedArea,
      sort,
    });
  }, [all, search, facilities, maxDistance, sort, selectedDistrict, selectedArea]);

  // Any change to the search, filters or sort starts again from the first batch.
  useEffect(() => {
    setVisibleCount(BATCH_SIZE);
  }, [search, facilities, maxDistance, sort, selectedDistrict, selectedArea]);

  const totalResults = results.length;
  const paginatedResults = useMemo(() => results.slice(0, visibleCount), [results, visibleCount]);
  const hasMore = visibleCount < totalResults;

  // [Urmee · F1 Part 1] Appends the next batch. Only the button moves keyboard focus to the first new
  // card; the auto-load on scroll must not steal focus.
  const loadMore = (moveFocus) => {
    if (moveFocus) focusIndexRef.current = paginatedResults.length;
    setVisibleCount((count) => count + BATCH_SIZE);
  };

  // After "Load more", keyboard focus goes to the first new card.
  useEffect(() => {
    const index = focusIndexRef.current;
    if (index === null) return;
    focusIndexRef.current = null;
    gridRef.current?.querySelector(`[data-card-index="${index}"] a`)?.focus();
  }, [visibleCount]);

  // [Urmee · F1 Part 1] IntersectionObserver auto-load; the button stays as the keyboard/fallback path.
  // Nice to have: load the next batch as the button scrolls into view (the button stays for keyboard users).
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) loadMore(false); }, { rootMargin: "200px" });
    observer.observe(node);
    return () => observer.disconnect();
    // loadMore only touches state setters and a ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, visibleCount, view]);

  // Forget the selection when it drops out of the results.
  useEffect(() => {
    setSelectedMosqueId((current) => (current != null && results.some((mosque) => String(mosque.id) === String(current)) ? current : null));
  }, [results]);

  // [Urmee · F2 Part 2] Changing this key makes the map fit all pins (first load, filter change). null
  // while viewing "this area" so we don't fight the user's own panning.
  const fitKey = areaState.mosques
    ? null
    : [search, [...facilities].sort().join(","), selectedDistrict, selectedArea, maxDistance, nearbyMosques.length ? "ready" : "wait"].join("|");

  const viewToggle = (
    <div className="btn-group" role="group" aria-label="View toggle">
      <button type="button" aria-pressed={view === "list"} className={"btn btn-sm " + (view === "list" ? "btn-mc" : "btn-outline-mc")} onClick={() => setView("list")}>
        <ListIcon size={15} className="me-1" aria-hidden="true" />List
      </button>
      <button type="button" aria-pressed={view === "map"} className={"btn btn-sm " + (view === "map" ? "btn-mc" : "btn-outline-mc")} onClick={() => setView("map")}>
        <MapIcon size={15} className="me-1" aria-hidden="true" />Map
      </button>
    </div>
  );

  if (view === "map") {
    return (
      <section className="mc-browse-map-section">
        <BrowseMapLayout
          mosques={results}
          origin={origin}
          search={search}
          onSearchChange={setSearch}
          facilities={facilities}
          onToggleFacility={toggleFacility}
          onClearFilters={clearFilters}
          selectedMosqueId={selectedMosqueId}
          onSelect={setSelectedMosqueId}
          fitKey={fitKey}
          viewToggle={viewToggle}
          area={{ active: Boolean(areaState.mosques), loading: areaState.loading, error: areaState.error, onSearch: searchArea, onReset: resetArea }}
        />
      </section>
    );
  }

  return (
    <>
      <section className="mc-hero mc-browse-hero">
        <div className="container">
          <h1 className="h3 fw-bold mb-1">Browse Mosques</h1>
          <p className="mb-3 text-body-secondary">Find mosques that match your preferences.</p>
          <div className="input-group input-group-lg shadow-sm">
            <span className="input-group-text bg-white border-0"><Search size={18} className="text-mc" aria-hidden="true" /></span>
            <input
              type="text"
              className="form-control border-0"
              placeholder="Search by mosque name or area…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="mc-browse-section py-4 mc-motion-section">
        <div className="container">
          <div className="row g-4 mc-browse-layout mc-motion-stagger">
            {/* Filters */}
            <div className="col-lg-3 mc-browse-filter-column">
              <div className="card mc-card mc-browse-filters">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="fw-bold mb-0"><SlidersHorizontal size={16} className="me-1" aria-hidden="true" />Filters</h6>
                    <button className="btn btn-link btn-sm text-decoration-none p-0" onClick={clearFilters}>
                      Clear
                    </button>
                  </div>

                  {/* Location filter */}
                  <label className="form-label small fw-semibold text-uppercase text-muted mb-2">
                    <MapPin size={13} className="me-1" aria-hidden="true" />Location
                  </label>
                  <div className="mb-3">
                    <select
                      className="form-select form-select-sm mb-2"
                      value={selectedDistrict}
                      onChange={handleDistrictChange}
                      aria-label="Select district"
                    >
                      <option value="">All districts</option>
                      {locationOptions.districts.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>

                    <select
                      className="form-select form-select-sm"
                      value={selectedArea}
                      onChange={(e) => setSelectedArea(e.target.value)}
                      disabled={!selectedDistrict}
                      aria-label="Select area"
                    >
                      <option value="">All areas</option>
                      {selectedDistrict &&
                        locationOptions.areas[selectedDistrict]?.map((a) => (
                          <option key={a} value={a}>{a}</option>
                        ))}
                    </select>

                    {(selectedDistrict || selectedArea) && (
                      <button
                        className="btn btn-link btn-sm text-decoration-none p-0 mt-1"
                        onClick={clearLocation}
                      >
                        Clear Location
                      </button>
                    )}

                    <div className="mt-2" aria-live="polite">
                      {origin.status === "idle" && (
                        <button className="btn btn-sm btn-outline-mc" onClick={() => requestGeolocation({ force: origin.status === "failure" })}>Use my location</button>
                      )}
                      {origin.status === "requesting" && <div className="small text-muted">Requesting permission…</div>}
                      {origin.status === "locating" && <div className="small text-muted">Locating…</div>}
                      {origin.status === "success" && <div className="small text-success">Using your location — {all.length} mosques nearby</div>}
                      {origin.status === "failure" && <div className="small text-danger">Location unavailable — try manual search</div>}
                    </div>
                  </div>

                  <hr className="my-3" />

                  <label className="form-label small fw-semibold text-uppercase text-muted">Facilities</label>
                  <div className="mb-3">
                    {Object.entries(FACILITY_META).map(([key, meta]) => (
                      <div className="form-check" key={key}>
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id={`f_${key}`}
                          checked={facilities.has(key)}
                          onChange={() => toggleFacility(key)}
                        />
                        <label className="form-check-label small" htmlFor={`f_${key}`}>
                          <FacilityIcon facilityKey={key} size={14} className="me-1 text-mc" />
                          {meta.label}
                        </label>
                      </div>
                    ))}
                  </div>

                  <label className="form-label small fw-semibold text-uppercase text-muted">Max distance</label>
                  <input
                    type="range"
                    className="form-range"
                    min="1"
                    max={DISCOVERY_RADIUS_KM}
                    value={maxDistance ?? DISCOVERY_RADIUS_KM}
                    onChange={(e) => setMaxDistance(+e.target.value)}
                  />
                  <div className="small text-muted mb-3">
                    {maxDistance === null ? `Within ${DISCOVERY_RADIUS_KM} km` : `Within ${maxDistance} km`}
                  </div>

                  <label className="form-label small fw-semibold text-uppercase text-muted">Sort by</label>
                  <select className="form-select form-select-sm" value={sort} onChange={(e) => setSort(e.target.value)}>
                    <option value="distance">Nearest first</option>
                    <option value="rating">Highest rated</option>
                    <option value="name">Name (A–Z)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="col-lg-9 mc-browse-results">
              <div className="mc-browse-results-toolbar">
                <div className="text-muted mc-browse-results-count">
                  {`Showing ${paginatedResults.length} of ${totalResults} mosques`}
                </div>
                <div className="mc-browse-results-actions">
                  {viewToggle}
                </div>
              </div>

              <div className="mc-view-panel" key={view}>
                {discovery.status === "loading" && all.length === 0 ? (
                  <SkeletonRegion label="Loading nearby mosques…">
                    <div className="row row-cols-1 row-cols-sm-2 row-cols-lg-3 g-3">
                      {Array.from({ length: SKELETON_COUNT }, (_, index) => <div className="col" key={index}><MosqueCardSkeleton /></div>)}
                    </div>
                  </SkeletonRegion>
                ) : discovery.status === "error" ? (
                  <div className="text-center text-muted py-5" role="alert">
                    <TriangleAlert size={38} className="d-block mx-auto mb-2 text-danger" aria-hidden="true" />
                    <div className="mb-3">{discovery.error}</div>
                    <button type="button" className="btn btn-outline-mc btn-sm" onClick={discovery.retry}>
                      <RefreshCw size={14} aria-hidden="true" /> Retry
                    </button>
                  </div>
                ) : view === "list" ? (
                  results.length ? (
                    <div ref={gridRef} className="row row-cols-1 row-cols-sm-2 row-cols-lg-3 g-3 mc-browse-results-grid mc-motion-stagger">
                      {paginatedResults.map((m, index) => (
                        <div className="col" key={m.id} data-card-index={index}>
                          <MosqueCard mosque={m} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-muted py-5">
                      <Search size={42} className="d-block mx-auto mb-2 opacity-50" aria-hidden="true" />
                      No mosques match your filters. Try clearing some.
                    </div>
                  )
                ) : null}
              </div>

              {hasMore && (
                <div className="text-center mt-4" ref={sentinelRef}>
                  <button type="button" className="btn btn-outline-mc" onClick={() => loadMore(true)}>Load more mosques</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
