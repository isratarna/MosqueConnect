import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, CheckCircle, Clock, Save, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";

import { fetchPrayerSchedule, updatePrayerSchedule } from "../services/prayerScheduleService";

const PRAYERS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha", "Jummah"];

export default function MosqueAdminPrayerSchedule() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const selectedMosque = user?.managed_mosques?.find((item) => String(item.id) === params.get("mosque")) || user?.managed_mosques?.[0];

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [mosque, setMosque] = useState(null);
  
  const [schedule, setSchedule] = useState({
    Fajr: { adhan: "", iqamah: "" },
    Dhuhr: { adhan: "", iqamah: "" },
    Asr: { adhan: "", iqamah: "" },
    Maghrib: { adhan: "", iqamah: "" },
    Isha: { adhan: "", iqamah: "" },
    Jummah: { adhan: "", iqamah: "" },
  });

  const [actionSuccess, setActionSuccess] = useState("");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    if (!user || user.role !== "mosque_admin" || user.status !== "approved") {
      navigate("/admin/dashboard");
      return;
    }

    const managed = selectedMosque;
    if (managed) { setMosque(managed); loadSchedule(managed.id); }
    else { setActionError("No mosque is assigned to your account."); setLoading(false); }
  }, [user, navigate, selectedMosque?.id]);

  const loadSchedule = async (mosqueId) => {
    try {
      const data = await fetchPrayerSchedule(mosqueId);
      if (data) {
        setSchedule(data);
      }
    } catch (err) {
      setActionError(err.message || "Unable to load the prayer schedule.");
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (msg) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(""), 3000);
  };

  const showError = (msg) => {
    setActionError(msg);
    setTimeout(() => setActionError(""), 4000);
  };

  const handleChange = (prayer, type, value) => {
    setSchedule((prev) => ({
      ...prev,
      [prayer]: {
        ...prev[prayer],
        [type]: value,
      },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setActionError("");

    try {
      await updatePrayerSchedule(mosque.id, schedule);
      showSuccess("Prayer schedule updated successfully!");
    } catch (err) {
      showError(err.message || "An error occurred while saving the schedule.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-5 text-center" style={{ minHeight: "80vh" }}>
        <div className="spinner-border text-mc" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  const hasEmptyFields = PRAYERS.some(
    (p) => !schedule[p]?.adhan || !schedule[p]?.iqamah
  );

  return (
    <div className="container py-4 py-lg-5 mc-motion-section" style={{ maxWidth: "800px", minHeight: "85vh" }}>
      
      {/* Header */}
      <div className="d-flex flex-wrap align-items-center justify-content-between mb-4 gap-3 border-bottom pb-3">
        <div>
          <Link to="/admin/dashboard" className="text-secondary small fw-bold text-decoration-none d-flex align-items-center gap-1 mb-2">
            <ArrowLeft size={14} /> Back to Dashboard
          </Link>
          <h2 className="fw-bold mb-1 d-flex align-items-center gap-2">
            <Clock size={28} className="text-mc" />
            Manage Prayer Schedule
          </h2>
          <p className="text-muted mb-0 small">Update Adhan and Iqamah (Jamat) times for the community.</p>
        </div>
      </div>

      {actionSuccess && (
        <div className="alert alert-success py-2 px-3 mb-4 d-flex align-items-center gap-2 shadow-sm animate-fade-in">
          <CheckCircle size={18} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="alert alert-danger py-2 px-3 mb-4 d-flex align-items-center gap-2 shadow-sm animate-fade-in">
          <AlertCircle size={18} />
          <span>{actionError}</span>
        </div>
      )}

      {hasEmptyFields && (
        <div className="alert alert-info py-2 px-3 mb-4 d-flex align-items-center gap-2 shadow-sm">
          <Clock size={18} />
          <span className="small">Please fill in the missing prayer times to complete the schedule.</span>
        </div>
      )}

      <div className="card border-0 shadow-sm border-top border-4 border-mc bg-white">
        <div className="card-body p-4">
          <form onSubmit={handleSubmit}>
            
            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th style={{ width: "25%" }} className="fw-bold text-muted small text-uppercase">Prayer</th>
                    <th style={{ width: "35%" }} className="fw-bold text-muted small text-uppercase">Adhan Time</th>
                    <th style={{ width: "40%" }} className="fw-bold text-muted small text-uppercase">Iqamah (Jamat) Time</th>
                  </tr>
                </thead>
                <tbody>
                  {PRAYERS.map((prayer) => (
                    <tr key={prayer}>
                      <td className="fw-bold text-dark">{prayer}</td>
                      <td>
                        <input
                          type="time"
                          className="form-control"
                          value={schedule[prayer]?.adhan || ""}
                          onChange={(e) => handleChange(prayer, "adhan", e.target.value)}
                          required
                        />
                      </td>
                      <td>
                        <input
                          type="time"
                          className="form-control"
                          value={schedule[prayer]?.iqamah || ""}
                          onChange={(e) => handleChange(prayer, "iqamah", e.target.value)}
                          required
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="d-flex justify-content-end mt-4 pt-3 border-top">
              <button 
                type="submit" 
                className="btn btn-mc d-flex align-items-center gap-2 px-4 py-2"
                disabled={submitting}
              >
                {submitting ? (
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                ) : (
                  <Save size={18} />
                )}
                {submitting ? "Saving Schedule..." : "Save Changes"}
              </button>
            </div>
            
          </form>
        </div>
      </div>

    </div>
  );
}
