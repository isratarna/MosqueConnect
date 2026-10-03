import { useLocale } from "../../hooks/useLocale";

// [Urmee · VIVA] 5 oyakto namaz er list (fajr, dhuhr, asr, maghrib, isha). Grid er row eibhabe toiri hoy.
export const DAILY = [["fajr", "Fajr"], ["dhuhr", "Dhuhr"], ["asr", "Asr"], ["maghrib", "Maghrib"], ["isha", "Isha"]];

/** { fajr: { adhan_time, jamaat_time }, … } from the API's prayer_schedule rows (empty strings when a time isn't set). */
// [Urmee · VIVA] API er array ([{prayer, adhan_time, jamaat_time}]) ke { fajr: {...}, ... } object banay, jate form e easy edit kora jay.
export const timesFromRows = (rows = []) => {
  const byPrayer = Object.fromEntries(rows.map((row) => [row.prayer, row]));
  return Object.fromEntries(DAILY.map(([key]) => [key, {
    adhan_time: byPrayer[key]?.adhan_time || "",
    jamaat_time: byPrayer[key]?.jamaat_time || "",
  }]));
};

/** The body PUT …/prayer-schedule and …/prayer-times expect. */
// [Urmee · VIVA] Ulto kaj: form er object ke API er array banay (save er shomoy).
export const rowsFromTimes = (times) => DAILY.map(([prayer]) => ({ prayer, ...times[prayer] }));

/**
 * [Urmee · F4] The five-prayer adhan / jamaat editor, extracted from the dashboard's "Prayer & Jamat"
 * form so the default timetable and every dated period (winter, Ramadan, …) share one grid.
 * `times` is { fajr: { adhan_time, jamaat_time }, … }; `onChange(prayer, field, value)` edits one cell.
 */
// [Urmee · VIVA] Reusable 5 namaz er adhan/jamaat table. Default timetable ar protita period (winter/Ramadan) -- shobai ei ek component use kore, tai code duplicate hoy na. onChange diye parent state bodlay.
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
