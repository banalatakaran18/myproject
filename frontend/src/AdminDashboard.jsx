import React, { useState } from "react";
import PostJob from "./PostJob";
import Applications from "./Applications";
import "./AdminDashboard.css";

function AdminDashboard({ currentUser, onLogout }) {
    const [activeSection, setActiveSection] = useState("jobs");

    return (
        <div className="admin-dashboard">

            {/* Admin Header */}
            <header className="admin-header">
                <div>
                    <h1>JobPortal Admin</h1>
                    <p>
                        Welcome, {currentUser?.name || "Admin"}!
                        Manage your recruitment here.
                    </p>
                </div>

                <button type="button" onClick={onLogout}>
                    Logout
                </button>
            </header>

            {/* Dashboard Navigation Cards */}
            <section className="admin-stats">

                <button
                    type="button"
                    className={`admin-stat-card ${
                        activeSection === "jobs" ? "active-admin-card" : ""
                    }`}
                    onClick={() => setActiveSection("jobs")}
                >
                    <span className="admin-card-icon purple-icon">💼</span>
                    <h3>Job Management</h3>
                    <p>Create and manage job opportunities.</p>
                </button>

                <button
                    type="button"
                    className={`admin-stat-card ${
                        activeSection === "applications" ? "active-admin-card" : ""
                    }`}
                    onClick={() => setActiveSection("applications")}
                >
                    <span className="admin-card-icon blue-icon">📄</span>
                    <h3>Applications</h3>
                    <p>Review candidate applications.</p>
                </button>

                <button
                    type="button"
                    className={`admin-stat-card ${
                        activeSection === "recruitment" ? "active-admin-card" : ""
                    }`}
                    onClick={() => setActiveSection("recruitment")}
                >
                    <span className="admin-card-icon green-icon">👥</span>
                    <h3>Recruitment</h3>
                    <p>Track applicants and their status.</p>
                </button>

            </section>

            {/* Job Management */}
            {activeSection === "jobs" && (
                <section className="admin-panel">
                    <PostJob token={currentUser?.token} />
                </section>
            )}

            {/* Applications */}
            {activeSection === "applications" && (
                <div className="admin-content-area">
                    <Applications
                        currentUser={currentUser}
                        isAdmin={true}
                        token={currentUser?.token}
                    />
                </div>
            )}

            {/* Recruitment */}
            {activeSection === "recruitment" && (
                <div className="admin-content-area">
                    <Applications
                        currentUser={currentUser}
                        isAdmin={true}
                        token={currentUser?.token}
                        initialFilterStatus="Shortlisted"
                        heading="Recruitment Management - Shortlisted Candidates"
                    />
                </div>
            )}

        </div>
    );
}

export default AdminDashboard;