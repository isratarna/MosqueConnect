import { useMemo, useState } from "react";
import { List as ListIcon, Map as MapIcon, MapPin, Search, SlidersHorizontal } from "lucide-react";
import { useGeolocation } from "../hooks/useGeolocation";
import { mosquesByDistance, FACILITY_META } from "../data/mosques";
import FacilityIcon from "../components/FacilityIcon";
import MosqueCard from "../components/MosqueCard";
import MapView from "../components/MapView";

export default function Browse() {
  const origin = useGeolocation();
  const all = useMemo(() => mosquesByDistance(origin), [origin.lat, origin.lng]);

  const [search, setSearch] = useState("");
  const [facilities, setFacilities] = useState(() => new Set());
  const [maxDistance, setMaxDistance] = useState(null);
  const [sort, setSort] = useState("distance");
  const [view, setView] = useState("list");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedArea, setSelectedArea] = useState("");

  // Derive unique districts and areas from the mosque data.
  const locationOptions = useMemo(() => {
    const districtSet = new Set(all.map((m) => m.district));
    const districts = [...districtSet].sort();

    const areasByDistrict = {};
    for (const m of all) {
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

  const clearFilters = () => {
    setSearch("");
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
    const q = search.toLowerCase().trim();
    return all
      .filter((m) => {
        const matchesSearch =
          !q || m.name.toLowerCase().includes(q) || m.address.toLowerCase().includes(q);
        const matchesFacilities = [...facilities].every((f) => m.facilities.includes(f));
        const matchesDistance = maxDistance === null || m.distance <= maxDistance;
        const matchesDistrict =
          !selectedDistrict || m.district === selectedDistrict;
        const matchesArea =
          !selectedArea || m.area === selectedArea;
        return matchesSearch && matchesFacilities && matchesDistance && matchesDistrict && matchesArea;
      })
      .sort((a, b) => {
        if (sort === "rating") return b.rating - a.rating;
        if (sort === "name") return a.name.localeCompare(b.name);
        return a.distance - b.distance;
      });
  }, [all, search, facilities, maxDistance, sort, selectedDistrict, selectedArea]);

  return (
    <>
      <section className="mc-hero py-4">
        <div className="container">
          <h1 className="h3 fw-bold mb-1">Browse Mosques</h1>
          <p className="mb-3 text-white-50">Find mosques that match your preferences.</p>
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

      <section className="py-4">
        <div className="container">
          <div className="row g-4">
            {/* Filters */}
            <div className="col-lg-3">
              <div className="card mc-card">
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
                    max="20"
                    value={maxDistance ?? 20}
                    onChange={(e) => setMaxDistance(+e.target.value)}
                  />
                  <div className="small text-muted mb-3">
                    {maxDistance === null ? "All distances" : `Within ${maxDistance} km`}
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
            <div className="col-lg-9">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="text-muted">{results.length} mosques found</div>
                <div className="btn-group" role="group" aria-label="View toggle">
                  <button
                    className={"btn btn-sm " + (view === "list" ? "btn-mc" : "btn-outline-mc")}
                    onClick={() => setView("list")}
                  >
                    <ListIcon size={15} className="me-1" aria-hidden="true" />List
                  </button>
                  <button
                    className={"btn btn-sm " + (view === "map" ? "btn-mc" : "btn-outline-mc")}
                    onClick={() => setView("map")}
                  >
                    <MapIcon size={15} className="me-1" aria-hidden="true" />Map
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
                    <Search size={42} className="d-block mx-auto mb-2 opacity-50" aria-hidden="true" />
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
