import { useMemo, useState } from "react";
import { useLocale } from "../../hooks/useLocale";
import { formatApiDate } from "../../utils/intl";
import { applyTaraweeh, completeRows, dateKey, parseTimingsPaste, rowsForPeriod } from "../../utils/ramadan";
import { saveRamadanTimings } from "../../utils/scheduleApi";
import { formatClockTime } from "../../utils/prayerTime";

const MAX_DAYS = 31; // the API saves at most 31 days per request

/**
 * [Urmee · F4] Month grid for a Ramadan period: Sehri end, Iftar and Taraweeh for every day.
 * Admins usually have the Islamic Foundation timetable in Excel, so "Paste from a spreadsheet" fills the
 * grid from copied rows; "Same Taraweeh time" fills that column in one go; the preview shows exactly what
 * visitors will see on a chosen day. Blank days are not saved.
 */
export default function RamadanTimingsEditor({ mosqueId, period, onSaved }) {
  const { t, locale } = useLocale();
  const [rows, setRows] = useState(() => rowsForPeriod(period, period.ramadan_timings));
  const [paste, setPaste] = useState("");
  const [taraweeh, setTaraweeh] = useState("");
  const [previewDate, setPreviewDate] = useState(() => {
    const today = dateKey();
    return rows.some((row) => row.date === today) ? today : rows[0]?.date || "";
  });
  const [notice, setNotice] = useState(null); // { ok, text }
  const [saving, setSaving] = useState(false);

  const setCell = (date, field, value) => setRows((current) => current.map((row) => (row.date === date ? { ...row, [field]: value } : row)));
  const preview = useMemo(() => rows.find((row) => row.date === previewDate), [rows, previewDate]);
  const dayLabel = (date) => formatApiDate(date, locale, { weekday: "short", day: "numeric", month: "short" });

  const applyPaste = () => {
    const { rows: parsed, problems } = parseTimingsPaste(paste, period);
    const byDate = Object.fromEntries(parsed.map((row) => [row.date, row]));
    setRows((current) => current.map((row) => (byDate[row.date]
      ? { ...row, sehri_ends: byDate[row.date].sehri_ends, iftar: byDate[row.date].iftar, taraweeh_time: byDate[row.date].taraweeh_time || row.taraweeh_time }
      : row)));
    setNotice({
      ok: problems.length === 0,
      text: [t("schedule.ramadan.pasteApplied", { count: parsed.length }), problems.length ? t("schedule.ramadan.pasteProblems", { count: problems.length }) : ""].filter(Boolean).join(" "),
    });
  };

  const save = async () => {
    setSaving(true);
    setNotice(null);
    try {
      const saved = await saveRamadanTimings(mosqueId, period.id, completeRows(rows));
      setNotice({ ok: true, text: t("schedule.ramadan.saved") });
      onSaved?.(saved);
    } catch (error) {
      setNotice({ ok: false, text: error.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mc-ramadan-editor mt-3" aria-label={t("schedule.ramadan.title")}>
      <h4 className="h6">{t("schedule.ramadan.title")}</h4>
      <p className="small text-muted">{t("schedule.ramadan.help")}</p>
      {rows.length > MAX_DAYS && <div className="alert alert-warning py-2 small" role="alert">{t("schedule.ramadan.tooLong")}</div>}

      <div className="row g-3 mb-3">
        <div className="col-lg-7">
          <label className="form-label small fw-semibold" htmlFor={`paste-${period.id}`}>{t("schedule.ramadan.pasteTitle")}</label>
          <textarea id={`paste-${period.id}`} className="form-control form-control-sm" rows="3" value={paste} onChange={(event) => setPaste(event.target.value)} placeholder={"08/02/2027\t5:10\t5:55\t7:30"} />
          <div className="form-text">{t("schedule.ramadan.pasteHelp")}</div>
          <button type="button" className="btn btn-sm btn-outline-mc mt-1" onClick={applyPaste} disabled={!paste.trim()}>{t("schedule.ramadan.pasteApply")}</button>
        </div>
        <div className="col-lg-5">
          <label className="form-label small fw-semibold" htmlFor={`taraweeh-${period.id}`}>{t("schedule.ramadan.taraweehAll")}</label>
          <div className="input-group input-group-sm">
            <input id={`taraweeh-${period.id}`} type="time" className="form-control" value={taraweeh} onChange={(event) => setTaraweeh(event.target.value)} />
            <button type="button" className="btn btn-outline-mc" onClick={() => setRows((current) => applyTaraweeh(current, taraweeh))} disabled={!taraweeh}>{t("schedule.ramadan.taraweehApply")}</button>
          </div>
        </div>
      </div>

      <div className="table-responsive mc-ramadan-editor__table">
        <table className="table table-sm align-middle">
          <thead><tr><th scope="col">{t("schedule.ramadan.day")}</th><th scope="col">{t("schedule.ramadan.sehri")}</th><th scope="col">{t("schedule.ramadan.iftar")}</th><th scope="col">{t("schedule.ramadan.taraweeh")}</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.date} className={row.date === dateKey() ? "table-active" : undefined}>
                <th scope="row" className="text-nowrap fw-normal">{dayLabel(row.date)}</th>
                {[["sehri_ends", "schedule.ramadan.sehri"], ["iftar", "schedule.ramadan.iftar"], ["taraweeh_time", "schedule.ramadan.taraweeh"]].map(([field, label]) => (
                  <td key={field}>
                    <input type="time" className="form-control form-control-sm" aria-label={`${dayLabel(row.date)} ${t(label)}`} value={row[field] || ""} onChange={(event) => setCell(row.date, field, event.target.value)} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card border-0 bg-body-tertiary p-3 mb-3">
        <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
          <strong className="small">{t("schedule.ramadan.previewTitle", { date: previewDate ? dayLabel(previewDate) : "" })}</strong>
          <label className="visually-hidden" htmlFor={`preview-${period.id}`}>{t("schedule.ramadan.previewPick")}</label>
          <select id={`preview-${period.id}`} className="form-select form-select-sm w-auto" value={previewDate} onChange={(event) => setPreviewDate(event.target.value)}>
            {rows.map((row) => <option key={row.date} value={row.date}>{dayLabel(row.date)}</option>)}
          </select>
        </div>
        {preview?.sehri_ends && preview?.iftar ? (
          <ul className="list-inline mb-0 small">
            <li className="list-inline-item">{t("schedule.ramadan.sehri")}: <strong>{formatClockTime(preview.sehri_ends, locale)}</strong></li>
            <li className="list-inline-item">{t("schedule.ramadan.iftar")}: <strong>{formatClockTime(preview.iftar, locale)}</strong></li>
            {preview.taraweeh_time && <li className="list-inline-item">{t("schedule.ramadan.taraweeh")}: <strong>{formatClockTime(preview.taraweeh_time, locale)}</strong></li>}
          </ul>
        ) : <p className="small text-muted mb-0">{t("schedule.ramadan.previewEmpty")}</p>}
      </div>

      {notice && <div className={`alert ${notice.ok ? "alert-success" : "alert-danger"} py-2 small`} role={notice.ok ? "status" : "alert"}>{notice.text}</div>}
      <button type="button" className="btn btn-mc btn-sm" onClick={save} disabled={saving}>{saving ? t("schedule.saving") : t("schedule.ramadan.save")}</button>
    </section>
  );
}
