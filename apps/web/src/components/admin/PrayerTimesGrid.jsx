import { useLocale } from "../../hooks/useLocale";

export const DAILY = [["fajr", "Fajr"], ["dhuhr", "Dhuhr"], ["asr", "Asr"], ["maghrib", "Maghrib"], ["isha", "Isha"]];

/** { fajr: { adhan_time, jamaat_time }, … } from the API's prayer_schedule rows (empty strings when a time isn't set). */
export const timesFromRows = (rows = []) => {
  const byPrayer = Object.fromEntries(rows.map((row) => [row.prayer, row]));
  return Object.fromEntries(DAILY.map(([key]) => [key, {
    adhan_time: byPrayer[key]?.adhan_time || "",
    jamaat_time: byPrayer[key]?.jamaat_time || "",
  }]));
};

/** The body PUT …/prayer-schedule and …/prayer-times expect. */
export const rowsFromTimes = (times) => DAILY.map(([prayer]) => ({ prayer, ...times[prayer] }));

/**
 * [Urmee · F4] The five-prayer adhan / jamaat editor, extracted from the dashboard's "Prayer & Jamat"
 * form so the default timetable and every dated period (winter, Ramadan, …) share one grid.
 * `times` is { fajr: { adhan_time, jamaat_time }, … }; `onChange(prayer, field, value)` edits one cell.
 */
export default function PrayerTimesGrid({ times, onChange, idPrefix = "prayer" }) {
  const { t } = useLocale();
  return (
    <div className="table-responsive">
      <table className="table align-middle">
        <thead><tr><th scope="col">{t("schedule.prayer")}</th><th scope="col">{t("schedule.adhan")}</th><th scope="col">{t("schedule.jamaat")}</th></tr></thead>
        <tbody>
          {DAILY.map(([key]) => (
            <tr key={key}>
              <th scope="row">{t(`prayer.${key}`)}</th>
              {["adhan_time", "jamaat_time"].map((field) => (
                <td key={field}>
                  <input
                    id={`${idPrefix}-${key}-${field}`}
                    type="time"
                    className="form-control"
                    required
                    aria-label={`${t(`prayer.${key}`)} ${field === "adhan_time" ? t("schedule.adhan") : t("schedule.jamaat")}`}
                    value={times[key]?.[field] || ""}
                    onChange={(event) => onChange(key, field, event.target.value)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
