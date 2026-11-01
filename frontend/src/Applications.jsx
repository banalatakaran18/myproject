
import React, { useEffect, useState } from "react";
function Applications({
                          currentUser,
                          isAdmin = true,
                          token,
                          initialFilterStatus = "All",
                          heading
                      }) {
    const [applications, setApplications] = useState([]);
    const [filterStatus, setFilterStatus] = useState(initialFilterStatus);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const applicantsPerPage = 5;

    // Load applications from the backend
    useEffect(() => {
        let cancelled = false;

        const loadApplications = async () => {
            setLoading(true);
            setError("");

            if (!token) {
                setError("Login token is missing. Please log out and log in again.");
                setLoading(false);
                return;
            }

            const endpoint = isAdmin
                ? "http://localhost:8080/api/applications"
                : `http://localhost:8080/api/applications/my?email=${encodeURIComponent(
                    currentUser?.email || ""
                )}`;
            try {
                const response = await fetch(endpoint, {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error(
                        `Unable to load applications (HTTP ${response.status})`
                    );
                }

                const data = await response.json();

                if (!Array.isArray(data)) {
                    throw new Error("Unexpected response from the server.");
                }

                if (!cancelled) {
                    setApplications(data);
                    setCurrentPage(1);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err.message || "Unable to load applications. Please try again."
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadApplications();

        return () => {
            cancelled = true;
        };
    }, [isAdmin, currentUser?.email, token]);

    // Update an application's status (Admin only)
    const updateApplicationStatus = async (applicationId, newStatus) => {
        if (!token) {
            throw new Error("Login token is missing. Please log in again.");
        }

        const response = await fetch(
            `http://localhost:8080/api/applications/${applicationId}/status`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ status: newStatus }),
            }
        );

        if (!response.ok) {
            const message = await response.text();

            throw new Error(
                message || `Failed to update status (HTTP ${response.status})`
            );
        }
        setApplications((currentApplications) =>
            currentApplications.map((application) =>
                application.id === applicationId
                    ? { ...application, status: newStatus }
                    : application
            )
        );
    };
    // Search and filter
    const filteredApplications = applications.filter((application) => {
        const status = application.status || "Pending";

        const matchesStatus =
            filterStatus === "All" || status === filterStatus;

        const search = searchTerm.toLowerCase().trim();

        const matchesSearch =
            (application.applicantName || "").toLowerCase().includes(search) ||
            (application.email || "").toLowerCase().includes(search) ||
            (application.job?.title || "").toLowerCase().includes(search) ||
            (application.job?.location || "").toLowerCase().includes(search);

        return matchesStatus && matchesSearch;
    });

    const totalPages = Math.ceil(
        filteredApplications.length / applicantsPerPage
    );

    const startIndex = (currentPage - 1) * applicantsPerPage;

    const paginatedApplications = filteredApplications.slice(
        startIndex,
        startIndex + applicantsPerPage
    );

    const totalApplicants = applications.length;

    const pendingCount = applications.filter(
        (application) => (application.status || "Pending") === "Pending"
    ).length;
    const shortlistedCount = applications.filter(
        (application) => application.status === "Shortlisted"
    ).length;

    const selectedCount = applications.filter(
        (application) => application.status === "Selected"
    ).length;

    const rejectedCount = applications.filter(
        (application) => application.status === "Rejected"
    ).length;

    if (loading) {
        return <p>Loading applications...</p>;
    }

    if (error) {
        return (
            <section className="applications-section">
                <h2>
                    {isAdmin ? "Manage All Applications" : "My Applications"}
                </h2>
                <p role="alert">{error}</p>
                <button onClick={() => window.location.reload()}>
                    Reload Page
                </button>
            </section>
        );
    }

    const openResume = async (applicationId) => {
        try {
            const response = await fetch(
                `http://localhost:8080/api/applications/${applicationId}/resume`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) {
                throw new Error(
                    `Resume open nahi hua. HTTP ${response.status}`
                );
            }

            const pdfBlob = await response.blob();
            const pdfUrl = URL.createObjectURL(pdfBlob);
            window.open(pdfUrl, "_blank", "noopener,noreferrer");
        } catch (error) {
            alert(error.message);
        }
    };

    return (
        <section className="applications-section">
            <h2>
                {heading || (isAdmin ? "Manage All Applications" : "My Applications")}
            </h2>
            {/* Summary Cards */}
            <div className="application-summary-cards">
                <div className="application-summary-card total-card">
                    <span className="summary-label">
                        {isAdmin ? "Total Applicants" : "My Applications"}
                    </span>
                    <h3>{totalApplicants}</h3>
                    <p>All applications received</p>
                </div>

                <div className="application-summary-card pending-card">
                    <span className="summary-label">Pending</span>
                    <h3>{pendingCount}</h3>
                    <p>Awaiting review</p>
                </div>
                <div className="application-summary-card shortlisted-card">
                    <span className="summary-label">Shortlisted</span>
                    <h3>{shortlistedCount}</h3>
                    <p>Awaiting final decision</p>
                </div>

                <div className="application-summary-card selected-card">
                    <span className="summary-label">Selected</span>
                    <h3>{selectedCount}</h3>
                    <p>Successful applicants</p>
                </div>

                <div className="application-summary-card rejected-card">
                    <span className="summary-label">Rejected</span>
                    <h3>{rejectedCount}</h3>
                    <p>Not selected</p>
                </div>
            </div>

            {/* Search */}
            <div className="applications-search">
                <input
                    type="text"
                    placeholder="Search by name, email, job title, or location..."
                    value={searchTerm}
                    onChange={(event) => {
                        setSearchTerm(event.target.value);
                        setCurrentPage(1);
                    }}
                />
            </div>

            {/* Status Filter */}
            <div className="applications-filter">
                <label htmlFor="statusFilter">Filter by status:</label>
                <select
                    id="statusFilter"
                    value={filterStatus}
                    onChange={(event) => {
                        setFilterStatus(event.target.value);
                        setCurrentPage(1);
                    }}
                >
                    <option value="All">All Applications</option>
                    <option value="Pending">Pending</option>
                    <option value="Selected">Selected</option>
                    <option value="Shortlisted">Shortlisted</option>
                    <option value="Rejected">Rejected</option>
                </select>
            </div>

            {/* Applications Table */}
            {applications.length === 0 ? (
                <p>No applications received yet.</p>
            ) : filteredApplications.length === 0 ? (
                <p>No applications found. Try another search or status filter.</p>
            ) : (
                <>
                    <div className="applications-table-wrapper">
                        <table className="applications-table">
                            <thead>
                            <tr>
                                <th>Applicant</th>
                                <th>Email</th>
                                <th>Applied For</th>
                                <th>Location</th>
                                <th>Resume</th>
                                <th>Status</th>
                            </tr>
                            </thead>

                            <tbody>
                            {paginatedApplications.map((application) => {
                                const status = application.status || "Pending";

                                return (
                                    <tr key={application.id}>
                                        <td>{application.applicantName}</td>
                                        <td>{application.email}</td>
                                        <td>{application.job?.title || "N/A"}</td>
                                        <td>{application.job?.location || "N/A"}</td>





                                        <td>
                                            {application.resumeFileName ? (
                                                <button
                                                    type="button"
                                                    onClick={() => openResume(application.id)}
                                                >
                                                    View Resume
                                                </button>
                                            ) : application.resumeUrl ? (
                                                <a
                                                    href={application.resumeUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    View Resume
                                                </a>
                                            ) : (
                                                "Not provided"
                                            )}
                                        </td>


                                        <td>
                                            <div className="application-status-cell">
                                                    <span
                                                        className={`status-badge ${status.toLowerCase()}`}
                                                    >
                                                        {status}
                                                    </span>
                                                {isAdmin && (
                                                    <select
                                                        className="application-status-select"
                                                        aria-label={`Update status for ${application.applicantName}`}
                                                        value={status}
                                                        onChange={async (event) => {
                                                            const newStatus = event.target.value;

                                                            if (newStatus === status) return;

                                                            try {
                                                                await updateApplicationStatus(
                                                                    application.id,
                                                                    newStatus
                                                                );
                                                            } catch (err) {
                                                                alert(
                                                                    err.message ||
                                                                    "Status update failed. Please try again."
                                                                );
                                                            }
                                                        }}
                                                    >
                                                        {status === "Pending" && (
                                                            <>
                                                                <option value="Pending">Pending</option>
                                                                <option value="Shortlisted">Shortlist Candidate</option>
                                                                <option value="Selected">Select Candidate</option>
                                                                <option value="Rejected">Reject Candidate</option>
                                                            </>
                                                        )}

                                                        {status === "Shortlisted" && (
                                                            <>
                                                                <option value="Shortlisted">Shortlisted</option>
                                                                <option value="Selected">Select Candidate</option>
                                                                <option value="Rejected">Reject Candidate</option>
                                                            </>
                                                        )}

                                                        {status === "Selected" && (
                                                            <option value="Selected">Selected</option>
                                                        )}

                                                        {status === "Rejected" && (
                                                            <>
                                                            <option value="Rejected">Rejected</option>
                                                            <option value="Selected">Select Candidate</option>
                                                            </>
                                                        )}
                                                    </select>
                                                )}

                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="pagination-controls">
                        <button
                            onClick={() =>
                                setCurrentPage((page) => Math.max(1, page - 1))
                            }
                            disabled={currentPage === 1}
                        >
                            Previous
                        </button>

                        <span>
                            Page {currentPage} of {Math.max(1, totalPages)}
                        </span>

                        <button
                            onClick={() =>
                                setCurrentPage((page) =>
                                    Math.min(totalPages, page + 1)
                                )
                            }
                            disabled={
                                totalPages === 0 || currentPage >= totalPages
                            }
                        >
                            Next
                        </button>
                    </div>
                </>
            )}
        </section>
    );
}

export default Applications;
