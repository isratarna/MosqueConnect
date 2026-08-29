import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Clock,
  Edit,
  Eye,
  EyeOff,
  Megaphone,
  Plus,
  Trash2,
  X
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { MOSQUES, saveMosqueToLocal } from "../data/mosques";
import { createAnnouncementId } from "../data/announcements";

export default function MosqueAdminAnnouncements() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [mosque, setMosque] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submittingForm, setSubmittingForm] = useState(false);
  
  // Form Fields
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [urgency, setUrgency] = useState("low");
  const [status, setStatus] = useState("published");

  // Feedback
  const [actionSuccess, setActionSuccess] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (!user || user.role !== "mosque_admin" || user.status !== "approved") {
      navigate("/admin/dashboard");
      return;
    }

    const mockName = user.mosqueName || "My Mosque Profile";
    const found = MOSQUES.find(
      (m) => m.name.trim().toLowerCase() === mockName.trim().toLowerCase()
    );

    if (found) {
      setMosque(found);
      // Ensure all announcements have a status property for the UI (default to published if missing)
      setAnnouncements((found.announcements || []).map(a => ({
        ...a,
        status: a.status || "published"
      })));
    }
    
    // Simulate network delay for realism
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, [user, navigate]);

  const handleSaveToStorage = (updatedList) => {
    setAnnouncements(updatedList);
    if (mosque) {
      const updatedMosque = { ...mosque, announcements: updatedList };
      saveMosqueToLocal(updatedMosque);
    }
  };

  const showSuccess = (msg) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(""), 3000);
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setTitle("");
    setBody("");
    setUrgency("low");
    setStatus("published");
    setShowForm(true);
  };

  const handleOpenEdit = (announce) => {
    setEditingId(announce.id);
    setTitle(announce.title);
    setBody(announce.body);
    setUrgency(announce.urgency || "low");
    setStatus(announce.status || "published");
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmittingForm(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    if (editingId) {
      const updatedList = announcements.map(a => 
        a.id === editingId 
          ? { ...a, title, body, urgency, status, date: a.date } 
          : a
      );
      handleSaveToStorage(updatedList);
      showSuccess("Announcement updated successfully!");
    } else {
      const newAnnounce = {
        id: createAnnouncementId(),
        title,
        body,
        urgency,
        status,
        date: new Date().toISOString().split("T")[0],
      };
      handleSaveToStorage([newAnnounce, ...announcements]);
      showSuccess("Announcement created successfully!");
    }
    
    setSubmittingForm(false);
    setShowForm(false);
  };

  const handleToggleStatus = (id) => {
    const updatedList = announcements.map(a => {
      if (a.id === id) {
        return { ...a, status: a.status === "published" ? "draft" : "published" };
      }
      return a;
    });
    handleSaveToStorage(updatedList);
    showSuccess("Announcement status updated!");
  };

  const confirmDelete = (id) => {
    setDeletingId(id);
  };

  const executeDelete = () => {
    if (!deletingId) return;
    const updatedList = announcements.filter(a => a.id !== deletingId);
    handleSaveToStorage(updatedList);
    setDeletingId(null);
    showSuccess("Announcement deleted successfully.");
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

  return (
    <div className="container py-4 py-lg-5 mc-motion-section" style={{ maxWidth: "1000px", minHeight: "85vh" }}>
      
      {/* Header */}
      <div className="d-flex flex-wrap align-items-center justify-content-between mb-4 gap-3 border-bottom pb-3">
        <div>
          <Link to="/admin/dashboard" className="text-secondary small fw-bold text-decoration-none d-flex align-items-center gap-1 mb-2">
            <ArrowLeft size={14} /> Back to Dashboard
          </Link>
          <h2 className="fw-bold mb-1 d-flex align-items-center gap-2">
            <Megaphone size={28} className="text-mc" />
            Manage Announcements
          </h2>
          <p className="text-muted mb-0 small">Publish news, warnings, and updates to your community.</p>
        </div>
        <button 
          className="btn btn-mc d-flex align-items-center gap-2"
          onClick={showForm && !editingId ? () => setShowForm(false) : handleOpenCreate}
        >
          {showForm && !editingId ? "Cancel Creation" : <><Plus size={18} /> New Announcement</>}
        </button>
      </div>

      {actionSuccess && (
        <div className="alert alert-success py-2 px-3 mb-4 d-flex align-items-center gap-2 shadow-sm animate-fade-in">
          <CheckCircle size={18} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Create / Edit Form */}
      {showForm && (
        <div className="card border-0 shadow-sm mb-5 border-top border-4 border-mc bg-light">
          <div className="card-body p-4">
            <div className="d-flex justify-content-between align-items-start mb-4">
              <h5 className="fw-bold mb-0">{editingId ? "Edit Announcement" : "Create New Announcement"}</h5>
              <button className="btn-close" onClick={() => setShowForm(false)} aria-label="Close form"></button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                <div className="col-md-12 mb-3">
                  <label className="form-label fw-semibold small">Title <span className="text-danger">*</span></label>
                  <input type="text" className="form-control" placeholder="e.g. Mosque Renovation Progress" value={title} onChange={(e) => setTitle(e.target.value)} required />
                </div>
                <div className="col-12 mb-3">
                  <label className="form-label fw-semibold small">Message Content <span className="text-danger">*</span></label>
                  <textarea className="form-control" rows="4" placeholder="Provide details about the announcement..." value={body} onChange={(e) => setBody(e.target.value)} required></textarea>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold small">Priority Level</label>
                  <select className="form-select" value={urgency} onChange={(e) => setUrgency(e.target.value)}>
                    <option value="low">Low (General Info)</option>
                    <option value="medium">Medium (Warning / Alert)</option>
                    <option value="high">High (Urgent)</option>
                  </select>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold small">Status</label>
                  <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="published">Published (Visible to all)</option>
                    <option value="draft">Draft (Hidden)</option>
                  </select>
                </div>
              </div>
              <div className="d-flex justify-content-end gap-2 mt-2">
                <button type="button" className="btn btn-light border" onClick={() => setShowForm(false)} disabled={submittingForm}>Cancel</button>
                <button type="submit" className="btn btn-mc d-flex align-items-center gap-2" disabled={submittingForm}>
                  {submittingForm ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> : <CheckCircle size={16} />}
                  {submittingForm ? "Saving..." : editingId ? "Save Changes" : "Create Announcement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Simulated via overlay) */}
      {deletingId && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show d-block" tabIndex="-1" role="dialog">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow-lg">
                <div className="modal-header border-0 pb-0">
                  <h5 className="modal-title fw-bold text-danger d-flex align-items-center gap-2">
                    <AlertCircle size={22} /> Confirm Deletion
                  </h5>
                  <button type="button" className="btn-close" onClick={() => setDeletingId(null)} aria-label="Close"></button>
                </div>
                <div className="modal-body py-4">
                  <p className="mb-0">Are you sure you want to permanently delete this announcement? This action cannot be undone.</p>
                </div>
                <div className="modal-footer border-0 pt-0">
                  <button type="button" className="btn btn-light border" onClick={() => setDeletingId(null)}>Cancel</button>
                  <button type="button" className="btn btn-danger" onClick={executeDelete}>Yes, Delete</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Announcements List */}
      {announcements.length === 0 ? (
        <div className="text-center py-5 text-muted border rounded shadow-sm bg-white mt-4">
          <Megaphone size={48} className="mb-3 opacity-25 mx-auto" />
          <h5 className="fw-bold">No Announcements</h5>
          <p className="mb-0">You haven't posted any announcements yet.</p>
          <button className="btn btn-outline-mc mt-3" onClick={handleOpenCreate}>Create Your First</button>
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {announcements.map((announce) => (
            <div className={`card border-0 shadow-sm overflow-hidden border-start border-4 ${announce.status === 'published' ? 'border-success' : 'border-warning'}`} key={announce.id}>
              <div className="card-body p-4">
                <div className="row align-items-center gap-3 gap-md-0">
                  
                  <div className="col-md-9">
                    <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                      <h5 className="fw-bold mb-0 text-dark">{announce.title}</h5>
                      <span className={`badge ${announce.status === 'published' ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-warning-subtle text-dark border border-warning-subtle'}`}>
                        {announce.status === 'published' ? 'Published' : 'Draft'}
                      </span>
                      {announce.urgency === 'high' && <span className="badge bg-danger">Urgent</span>}
                    </div>
                    
                    <p className="text-secondary small mb-3">{announce.body}</p>
                    
                    <div className="d-flex align-items-center gap-2 small text-muted">
                      <Clock size={14} /> <span>Posted: {announce.date}</span>
                      {announce.urgency !== 'low' && (
                        <>
                          <span className="mx-1">•</span>
                          <span>Priority: <span className="text-capitalize">{announce.urgency}</span></span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="col-md-3">
                    <div className="d-flex flex-md-column flex-row gap-2 justify-content-end align-items-stretch align-items-md-end h-100 mt-2 mt-md-0">
                      <button 
                        className={`btn btn-sm ${announce.status === 'published' ? 'btn-outline-warning' : 'btn-outline-success'} d-flex align-items-center justify-content-center gap-2 w-100`}
                        onClick={() => handleToggleStatus(announce.id)}
                      >
                        {announce.status === 'published' ? <><EyeOff size={14} /> Unpublish</> : <><Eye size={14} /> Publish</>}
                      </button>
                      <button 
                        className="btn btn-sm btn-outline-secondary d-flex align-items-center justify-content-center gap-2 w-100"
                        onClick={() => handleOpenEdit(announce)}
                      >
                        <Edit size={14} /> Edit
                      </button>
                      <button 
                        className="btn btn-sm btn-outline-danger d-flex align-items-center justify-content-center gap-2 w-100"
                        onClick={() => confirmDelete(announce.id)}
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
