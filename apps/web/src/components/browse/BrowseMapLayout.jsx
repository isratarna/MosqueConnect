import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { List as ListIcon, LoaderCircle, Map as MapIcon, Maximize2, Minimize2, Navigation, RefreshCw, Search, X } from "lucide-react";
import MapView from "../MapView";
import FacilityIcon from "../FacilityIcon";
import VerifiedBadge from "../VerifiedBadge";
import { FACILITY_META } from "../../data/mosques";
import { useNow } from "../../hooks/useNow";
import { coordinatesOf } from "../../utils/mosqueDiscovery";
import { nextJamaatLabel } from "../../utils/prayerTime";
import { useLocale } from "../../hooks/useLocale";

const scrollBehavior = () => (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth");

/**
 * Browse "Map" view: a list panel next to a map that shows every filtered mosque.
 * Selecting a row moves the map; clicking a pin highlights its row; hovering a row
 * enlarges its pin. After the user pans or zooms, "Search this area" asks for the
 * mosques in the visible rectangle. On phones the map fills the screen and a floating
 * button switches to the list.
 */
// [Urmee · F2 Part 2] Browse "Map" view: list panel + map, synced both ways.
export default function BrowseMapLayout({
  mosques,
  origin,
  search,
  onSearchChange,
  facilities,
  onToggleFacility,
  onClearFilters,
  selectedMosqueId,
  onSelect,
  fitKey,
  viewToggle,
  area, // { active, loading, error, onSearch(bounds), onReset }
}) {
  const { t, locale } = useLocale(); // [Urmee · i18n browse] text from the locale files; prayer names and times follow the language
  const now = useNow();
  const controlRef = useRef(null);
  const listRef = useRef(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [listOpen, setListOpen] = useState(true);
  const [fullScreen, setFullScreen] = useState(false);
  const [mobilePane, setMobilePane] = useState("map");
  const [moved, setMoved] = useState(false);

  // [Urmee · F2 Part 2] Pin click -> highlight its row and scroll it into view (smooth unless reduced
  // motion).
  // Pin click (or any selection) scrolls the matching row into view.
  useEffect(() => {
    if (selectedMosqueId == null) return;
    listRef.current?.querySelector(`[data-mosque-row="${selectedMosqueId}"]`)?.scrollIntoView({ block: "nearest", behavior: scrollBehavior() });
  }, [selectedMosqueId]);

  // Escape leaves full-screen.
  useEffect(() => {
    if (!fullScreen) return undefined;
    const onKey = (event) => { if (event.key === "Escape") setFullScreen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [fullScreen]);

  // Reset the "moved" hint once new area results arrive.
  useEffect(() => { if (!area.loading) setMoved(false); }, [area.loading, area.active]);

  // [Urmee · F2 Part 2] Row click -> select, pan the map to at least zoom 15 and open the info window.
  const selectRow = (mosque) => {
    onSelect(mosque.id);
    controlRef.current?.panTo(coordinatesOf(mosque), 15);
    setMobilePane("map");
  };

  const searchThisArea = () => {
    const bounds = controlRef.current?.getBounds();
    if (bounds) area.onSearch(bounds);
  };

  return (
    <div className={`mc-map-split${fullScreen ? " is-fullscreen" : ""}${listOpen ? "" : " is-list-hidden"}`} data-pane={mobilePane}>
      <aside className="mc-map-split__panel" aria-label={t("browseMap.listLabel")}>
        <div className="mc-map-split__panel-head">
          <div className="d-flex align-items-center justify-content-between gap-2 mb-2">
            <h2 className="h6 fw-bold mb-0" aria-live="polite">{t(area.active ? "browseMap.inArea" : "browseMap.count", { count: mosques.length })}</h2>
            {viewToggle}
          </div>
          <label className="visually-hidden" htmlFor="map-search">{t("browseMap.searchLabel")}</label>
          <div className="input-group input-group-sm mb-2">
            <span className="input-group-text"><Search size={14} aria-hidden="true" /></span>
            <input id="map-search" type="search" className="form-control" placeholder={t("browseMap.searchPlaceholder")} value={search} onChange={(event) => onSearchChange(event.target.value)} />
          </div>
          <div className="mc-map-split__chips" role="group" aria-label={t("browseMap.filterFacility")}>
            {Object.entries(FACILITY_META).map(([key, meta]) => (
              <button key={key} type="button" className={`mc-map-split__chip${facilities.has(key) ? " is-on" : ""}`} aria-pressed={facilities.has(key)} onClick={() => onToggleFacility(key)} title={t(meta.labelKey, { defaultValue: meta.label })}>
                <FacilityIcon facilityKey={key} size={13} /> {t(meta.labelKey, { defaultValue: meta.label })}
              </button>
            ))}
            {(facilities.size > 0 || search) && <button type="button" className="btn btn-link btn-sm p-0 ms-1" onClick={onClearFilters}>{t("browseMap.clear")}</button>}
          </div>
          {area.active && (
            <button type="button" className="btn btn-link btn-sm p-0 mt-2" onClick={area.onReset}><RefreshCw size={13} aria-hidden="true" /> {t("browseMap.backNearMe")}</button>
          )}
        </div>

        <ul className="mc-map-split__list" ref={listRef}>
          {mosques.length === 0 && <li className="p-3 text-muted small">{t("browseMap.noMatch")}</li>}
          {mosques.map((mosque) => {
            const next = nextJamaatLabel(mosque.prayer, now, { locale, t });
            const selected = String(mosque.id) === String(selectedMosqueId);
            return (
              <li key={mosque.id} data-mosque-row={mosque.id} className={`mc-map-split__row${selected ? " is-selected" : ""}`}
                onMouseEnter={() => setHoveredId(mosque.id)} onMouseLeave={() => setHoveredId(null)}>
                <button type="button" className="mc-map-split__row-main" aria-pressed={selected} onClick={() => selectRow(mosque)}
                  onFocus={() => setHoveredId(mosque.id)} onBlur={() => setHoveredId(null)}>
                  <span className="d-flex align-items-start justify-content-between gap-2">
                    <strong className="mc-map-split__name">{mosque.name}{mosque.verified && <VerifiedBadge className="ms-1" />}</strong>
                    <span className="badge mc-badge text-nowrap">{t("common.distanceKm", { distance: mosque.distance })}</span>
                  </span>
                  <span className="small text-muted d-block">{mosque.address}</span>
                  <span className="d-flex flex-wrap align-items-center gap-2 small mt-1">
                    {next && <span className="text-muted">{t("browseMap.next", { text: next.text })}</span>}
                    {mosque.facilities.slice(0, 4).map((key) => <FacilityIcon key={key} facilityKey={key} size={14} className="text-mc" title={t(`facility.${key}`, { defaultValue: FACILITY_META[key]?.label || key })} />)}
                  </span>
                </button>
                <Link to={`/mosque/${mosque.id}`} className="mc-map-split__row-link" aria-label={t("browseMap.view", { name: mosque.name })}><Navigation size={14} aria-hidden="true" /></Link>
              </li>
            );
          })}
        </ul>
      </aside>

      <div className="mc-map-split__map">
        <MapView
          enhanced
          className="mc-map mc-map-split__canvas"
          center={origin}
          zoom={12}
          mosques={mosques}
          userPos={origin.fallback ? null : { lat: origin.lat, lng: origin.lng }}
          selectedMosqueId={selectedMosqueId}
          onMosqueSelect={onSelect}
          hoveredMosqueId={hoveredId}
          fitKey={fitKey}
          onUserMove={() => setMoved(true)}
          controlRef={controlRef}
        />

        <div className="mc-map-split__overlay mc-map-split__overlay--top">
          <button type="button" className="btn btn-sm btn-light shadow-sm d-none d-lg-inline-flex align-items-center gap-1" onClick={() => setListOpen((open) => !open)} aria-pressed={!listOpen}>
            {listOpen ? <X size={14} aria-hidden="true" /> : <ListIcon size={14} aria-hidden="true" />} {listOpen ? t("browseMap.hideList") : t("browseMap.showList")}
          </button>
          {(moved || area.loading || area.error) && (
            <button type="button" className="btn btn-sm btn-mc shadow-sm d-inline-flex align-items-center gap-1" onClick={searchThisArea} disabled={area.loading}>
              {area.loading ? <LoaderCircle size={14} className="spin" aria-hidden="true" /> : <Search size={14} aria-hidden="true" />} {area.loading ? t("browseMap.searching") : t("browseMap.searchArea")}
            </button>
          )}
          <button type="button" className="btn btn-sm btn-light shadow-sm ms-auto d-inline-flex align-items-center gap-1" onClick={() => setFullScreen((on) => !on)} aria-pressed={fullScreen}>
            {fullScreen ? <Minimize2 size={14} aria-hidden="true" /> : <Maximize2 size={14} aria-hidden="true" />} {fullScreen ? t("browseMap.exitFull") : t("browseMap.fullScreen")}
          </button>
        </div>
        {area.error && <div className="mc-map-split__toast alert alert-danger py-1 px-2 small mb-0" role="alert">{area.error}</div>}

      </div>

      <button type="button" className="mc-map-split__fab btn btn-mc shadow d-lg-none" onClick={() => setMobilePane((pane) => (pane === "map" ? "list" : "map"))}>
        {mobilePane === "map" ? <><ListIcon size={16} aria-hidden="true" /> {t("browseMap.list")}</> : <><MapIcon size={16} aria-hidden="true" /> {t("browseMap.map")}</>}
      </button>
    </div>
  );
}
