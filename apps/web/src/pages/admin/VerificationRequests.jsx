import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  BadgeCheck,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Download,
  FileText,
  MapPin,
  ShieldCheck,
  UserRound,
  XCircle,
  AlertTriangle
} from "lucide-react";

// Dummy data for initial UI before backend integration
const DUMMY_REQUESTS = [
  {
    id: "req-101",
    applicantName: "Ahmed Ali",
    applicantEmail: "ahmed@example.com",
    applicantPhone: "+880 171 234 5678",
    mosqueName: "Gulshan Central Mosque",
    mosqueAddress: "Gulshan-2, Dhaka, Bangladesh",
    role: "Mutawalli",
    date: "2026-08-20T14:30:00Z",
    status: "pending",
    proofDocumentUrl: "#"
  },
  {
    id: "req-102",
    applicantName: "Hasan Rahman",
    applicantEmail: "hasan.r@example.com",
    applicantPhone: "+880 191 234 5678",
    mosqueName: "Banani Jame Mosque",
    mosqueAddress: "Block E, Banani, Dhaka",
    role: "Imam",
    date: "2026-08-19T09:15:00Z",
    status: "pending",
    proofDocumentUrl: "#"
  },
  {
    id: "req-103",
    applicantName: "Imran Hossain",
    applicantEmail: "imran@example.com",
    applicantPhone: "+880 181 234 5678",
    mosqueName: "Uttara Sector 4 Mosque",
    mosqueAddress: "Sector 4, Uttara, Dhaka",
    role: "Committee Member",
    date: "2026-08-18T16:45:00Z",
    status: "pending",
    proofDocumentUrl: "#"
  }
];

export default function VerificationRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionType, setActionType] = useState(null); // 'approve' | 'reject' | null
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);
  
  const [toast, setToast] = useState(null);

  // Placeholder function: Fetch requests from API
  const fetchRequests = async () => {
    setLoading(true);
    // Simulate API delay
    setTimeout(() => {
      setRequests(DUMMY_REQUESTS);
      setLoading(false);
    }, 800);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const closeModals = () => {
    setSelectedRequest(null);
    setActionType(null);
    setRejectionReason("");
  };

  // Placeholder function: Handle Approval API
  const handleApprove = async (id) => {
    setProcessing(true);
    // Simulate API delay
    setTimeout(() => {
      setRequests(prev => prev.filter(req => req.id !== id));
      setProcessing(false);
      showToast("Mosque ownership verified successfully.");
      closeModals();
    }, 1000);
  };

  // Placeholder function: Handle Rejection API
  const handleReject = async (id) => {
    if (!rejectionReason.trim()) return;
    
    setProcessing(true);
    // Simulate API delay
    setTimeout(() => {
      setRequests(prev => prev.filter(req => req.id !== id));
      setProcessing(false);
      showToast("Verification request rejected.", "danger");
      closeModals();
    }, 1000);
  };

  const formatDate = (isoString) => {
    return new Intl.DateTimeFormat('en-GB', { 
      day: 'numeric', month: 'short', year: 'numeric', 
      hour: 'numeric', minute: '2-digit', hour12: true 
    }).format(new Date(isoString));
  };

  return (
    <div className="container py-4 mc-motion-section">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <Link to="/admin/dashboard" className="text-decoration-none text-muted small d-flex align-items-center gap-1 mb-2">
            <ChevronLeft size={14} /> Back to Dashboard
          </Link>
          <h2 className="fw-bold mb-1 d-flex align-items-center gap-2">
            <ShieldCheck className="text-mc" size={28} />
            Verification Requests
          </h2>
          <p className="text-muted mb-0">Review and approve mosque ownership applications.</p>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        {loading ? (
          <div className="py-5 text-center">
            <div className="spinner-border text-mc mb-3" role="status"></div>
            <p className="text-muted mb-0">Loading requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="py-5 text-center">
            <div className="bg-light rounded-circle d-inline-flex p-4 mb-3">
              <BadgeCheck size={40} className="text-muted" />
            </div>
            <h5 className="fw-bold">All Caught Up!</h5>
            <p className="text-muted mb-0">There are no pending verification requests at the moment.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="bg-light">
                <tr>
                  <th className="border-0 px-4 py-3 text-muted fw-semibold small text-uppercase">Applicant</th>
                  <th className="border-0 px-4 py-3 text-muted fw-semibold small text-uppercase">Mosque</th>
                  <th className="border-0 px-4 py-3 text-muted fw-semibold small text-uppercase">Role</th>
                  <th className="border-0 px-4 py-3 text-muted fw-semibold small text-uppercase">Date</th>
                  <th className="border-0 px-4 py-3 text-end"></th>
                </tr>
              </thead>
              <tbody>
                {requests.map(req => (
                  <tr key={req.id}>
                    <td className="px-4 py-3">
                      <div className="fw-semibold">{req.applicantName}</div>
                      <div className="small text-muted">{req.applicantEmail}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="fw-semibold d-flex align-items-center gap-1">
                        <Building2 size={14} className="text-mc" /> {req.mosqueName}
                      </div>
                      <div className="small text-muted text-truncate" style={{ maxWidth: '250px' }}>
                        {req.mosqueAddress}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="badge bg-light text-dark border">{req.role}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="small text-muted d-flex align-items-center gap-1">
                        <Clock size={12} /> {formatDate(req.date)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-end">
                      <button 
                        className="btn btn-outline-mc btn-sm fw-semibold"
                        onClick={() => setSelectedRequest(req)}
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedRequest && !actionType && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold">Request Details</h5>
                <button type="button" className="btn-close" onClick={closeModals}></button>
              </div>
              <div className="modal-body">
                <div className="row g-4">
                  <div className="col-md-6">
                    <div className="card bg-light border-0 h-100 p-3">
                      <h6 className="fw-semibold text-mc mb-3 d-flex align-items-center gap-2">
                        <UserRound size={16} /> Applicant Info
                      </h6>
                      <div className="mb-2">
                        <small className="text-muted d-block">Full Name</small>
                        <span className="fw-semibold">{selectedRequest.applicantName}</span>
                      </div>
                      <div className="mb-2">
                        <small className="text-muted d-block">Email</small>
                        <span>{selectedRequest.applicantEmail}</span>
                      </div>
                      <div className="mb-2">
                        <small className="text-muted d-block">Phone</small>
                        <span>{selectedRequest.applicantPhone}</span>
                      </div>
                      <div>
                        <small className="text-muted d-block">Claimed Role</small>
                        <span className="badge bg-primary-subtle text-primary border border-primary-subtle">{selectedRequest.role}</span>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="card bg-light border-0 h-100 p-3">
                      <h6 className="fw-semibold text-mc mb-3 d-flex align-items-center gap-2">
                        <Building2 size={16} /> Mosque Info
                      </h6>
                      <div className="mb-2">
                        <small className="text-muted d-block">Mosque Name</small>
                        <span className="fw-semibold">{selectedRequest.mosqueName}</span>
                      </div>
                      <div className="mb-2">
                        <small className="text-muted d-block">Address</small>
                        <span className="d-flex align-items-start gap-1">
                          <MapPin size={14} className="mt-1 flex-shrink-0 text-muted" /> 
                          {selectedRequest.mosqueAddress}
                        </span>
                      </div>
                      <div>
                        <small className="text-muted d-block">Applied On</small>
                        <span className="d-flex align-items-center gap-1">
                          <Calendar size={14} className="text-muted" /> 
                          {formatDate(selectedRequest.date)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <h6 className="fw-semibold mb-2 d-flex align-items-center gap-2">
                    <FileText size={16} /> Proof Document
                  </h6>
                  <div className="border rounded p-3 d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center gap-3">
                      <div className="bg-light p-2 rounded text-mc">
                        <FileText size={24} />
                      </div>
                      <div>
                        <div className="fw-semibold small">authorization_letter.pdf</div>
                        <div className="text-muted" style={{ fontSize: '11px' }}>2.4 MB</div>
                      </div>
                    </div>
                    <a href={selectedRequest.proofDocumentUrl} className="btn btn-light btn-sm" target="_blank" rel="noreferrer">
                      <Download size={14} /> Download
                    </a>
                  </div>
                </div>
              </div>
              <div className="modal-footer border-0 pt-0 mt-3 d-flex gap-2">
                <button type="button" className="btn btn-outline-danger flex-fill" onClick={() => setActionType('reject')}>
                  Reject Request
                </button>
                <button type="button" className="btn btn-mc flex-fill" onClick={() => setActionType('approve')}>
                  Approve Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {actionType && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-body p-4 text-center">
                <div className="mb-3">
                  {actionType === 'approve' ? (
                    <div className="bg-success-subtle text-success d-inline-flex p-3 rounded-circle mb-2">
                      <CheckCircle2 size={40} />
                    </div>
                  ) : (
                    <div className="bg-danger-subtle text-danger d-inline-flex p-3 rounded-circle mb-2">
                      <AlertTriangle size={40} />
                    </div>
                  )}
                </div>
                <h4 className="fw-bold mb-2">
                  {actionType === 'approve' ? 'Approve Request?' : 'Reject Request?'}
                </h4>
                <p className="text-muted mb-4">
                  {actionType === 'approve' 
                    ? `Are you sure you want to verify ${selectedRequest?.applicantName} as an admin for ${selectedRequest?.mosqueName}?`
                    : `Are you sure you want to reject the application for ${selectedRequest?.mosqueName}? This action cannot be undone.`}
                </p>

                {actionType === 'reject' && (
                  <div className="text-start mb-4">
                    <label className="form-label fw-semibold small">Rejection Reason</label>
                    <textarea 
                      className="form-control bg-light" 
                      rows="3" 
                      placeholder="Please explain why this request is being rejected..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      autoFocus
                    ></textarea>
                    {!rejectionReason.trim() && <div className="form-text text-danger small">A reason is required.</div>}
                  </div>
                )}

                <div className="d-flex gap-2 justify-content-center">
                  <button type="button" className="btn btn-light px-4" onClick={() => setActionType(null)} disabled={processing}>
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    className={`btn px-4 ${actionType === 'approve' ? 'btn-mc' : 'btn-danger'}`}
                    onClick={() => actionType === 'approve' ? handleApprove(selectedRequest.id) : handleReject(selectedRequest.id)}
                    disabled={processing || (actionType === 'reject' && !rejectionReason.trim())}
                  >
                    {processing ? (
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                    ) : (
                      actionType === 'approve' ? 'Yes, Approve' : 'Yes, Reject'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="position-fixed bottom-0 end-0 p-3" style={{ zIndex: 2000 }}>
          <div className={`toast show align-items-center text-bg-${toast.type} border-0`} role="alert">
            <div className="d-flex">
              <div className="toast-body d-flex align-items-center gap-2">
                {toast.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                {toast.message}
              </div>
              <button type="button" className="btn-close btn-close-white me-2 m-auto" onClick={() => setToast(null)}></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
