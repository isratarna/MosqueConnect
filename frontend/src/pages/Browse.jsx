import { useMemo, useState } from "react";
import { useGeolocation } from "../hooks/useGeolocation";
import { mosquesByDistance, FACILITY_META } from "../data/mosques";
import MosqueCard from "../components/MosqueCard";
import MapView from "../components/MapView";

export default function Browse() {
  const origin = useGeolocation();
  const all = useMemo(() => mosquesByDistance(origin), [origin.lat, origin.lng]);

  const [search, setSearch] = useState("");
  const [facilities, setFacilities] = useState(() => new Set());
  const [maxDistance, setMaxDistance] = useState(20);
  const [sort, setSort] = useState("distance");
  const [view, setView] = useState("list");

  const toggleFacility = (key) => {
    setFacilities((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const clearFilters = () => {
    setSearch("");
    setFacilities(new Set());
    setMaxDistance(20);
    setSort("distance");
  };

  const results = useMemo(() => {
    const q = search.toLowerCase().trim();
    return all
      .filter((m) => {
        const matchesSearch =
          !q || m.name.toLowerCase().includes(q) || m.address.toLowerCase().includes(q);
        const matchesFacilities = [...facilities].every((f) => m.facilities.includes(f));
        const matchesDistance = m.distance <= maxDistance;
        return matchesSearch && matchesFacilities && matchesDistance;
      })
      .sort((a, b) => {
        if (sort === "rating") return b.rating - a.rating;
        if (sort === "name") return a.name.localeCompare(b.name);
        return a.distance - b.distance;
      });
  }, [all, search, facilities, maxDistance, sort]);

  return (
    <>
      <section className="mc-hero py-4">
        <div className="container">
          <h1 className="h3 fw-bold mb-1">Browse Mosques</h1>
          <p className="mb-3 text-white-50">Find mosques that match your preferences.</p>
          <div className="input-group input-group-lg shadow-sm">
            <span className="input-group-text bg-white border-0"><i className="bi bi-search text-mc" /></span>
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

      <section className="py-4">
        <div className="container">
          <div className="row g-4">
            {/* Filters */}
            <div className="col-lg-3">
              <div className="card mc-card">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="fw-bold mb-0"><i className="bi bi-funnel me-1" />Filters</h6>
                    <button className="btn btn-link btn-sm text-decoration-none p-0" onClick={clearFilters}>
                      Clear
                    </button>
                  </div>

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
                          <i className={`bi ${meta.icon} me-1 text-mc`} />
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
                    max="20"
                    value={maxDistance}
                    onChange={(e) => setMaxDistance(+e.target.value)}
                  />
                  <div className="small text-muted mb-3">Within {maxDistance} km</div>

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
            <div className="col-lg-9">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="text-muted">{results.length} mosques found</div>
                <div className="btn-group" role="group" aria-label="View toggle">
                  <button
                    className={"btn btn-sm " + (view === "list" ? "btn-mc" : "btn-outline-mc")}
                    onClick={() => setView("list")}
                  >
                    <i className="bi bi-list-ul me-1" />List
                  </button>
                  <button
                    className={"btn btn-sm " + (view === "map" ? "btn-mc" : "btn-outline-mc")}
                    onClick={() => setView("map")}
                  >
                    <i className="bi bi-map me-1" />Map
                  </button>
                </div>
              </div>

              {view === "list" ? (
                results.length ? (
                  <div className="row g-3">
                    {results.map((m) => (
                      <div className="col-md-6" key={m.id}>
                        <MosqueCard mosque={m} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted py-5">
                    <i className="bi bi-search fs-1 d-block mb-2 opacity-50" />
                    No mosques match your filters. Try clearing some.
                  </div>
                )
              ) : (
                <MapView
                  center={origin}
                  zoom={12}
                  mosques={results}
                  userPos={origin.fallback ? null : { lat: origin.lat, lng: origin.lng }}
                />
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
