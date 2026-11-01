import React, { useEffect, useState } from "react";
import "./App.css";
import Applications from "./Applications";
import Register from "./Register";
import Login from "./Login";
import AdminDashboard from "./AdminDashboard";
import ApplyForm from "./ApplyForm";

function App() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showRegister, setShowRegister] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    if (!currentUser?.token) return;
    const loadProfile = async () => {
      try {
        const response = await fetch("http://localhost:8080/api/profile", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${currentUser.token}`,
          },
        });

        if (!response.ok) {
          console.error("Failed to load profile:", response.status);
          return;
        }

        const data = await response.json();

        setCurrentUser((previousUser) => ({
          ...previousUser,
          ...data,
          token: previousUser.token,
        }));
      } catch (error) {
        console.error("Profile loading failed:", error);
      }
    };

    loadProfile();
  }, [currentUser?.token]);

  const [myApplications, setMyApplications] = useState([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [applicationsError, setApplicationsError] = useState("");
  const [activeSection, setActiveSection] = useState("dashboard");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: "",
    phone: "",
    location: "",
    education: "",
    skills: "",
    experience: "",
  });
  const [savedJobs, setSavedJobs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("savedJobs") || "[]");
    } catch {
      return [];
    }
  });
  const [selectedJob, setSelectedJob] = useState(null);
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [selectedProfileResume, setSelectedProfileResume] = useState(null);
  const [resumeUploading, setResumeUploading] = useState(false);

  useEffect(() => {
    const loadJobs = async () => {
      try {
        const response = await fetch(
            "http://localhost:8080/api/jobs"
        );

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }
        const data = await response.json();
        setJobs(data);
        setError("");
      } catch (err) {
        console.error("Jobs loading error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadJobs();
  }, []);

  useEffect(() => {
    if (!currentUser?.token || !currentUser?.email) return;

    const controller = new AbortController();

    async function loadMyApplications() {
      setApplicationsLoading(true);
      setApplicationsError("");

      try {
        const url =
            "http://localhost:8080/api/applications/my?email=" +
            encodeURIComponent(currentUser.email);

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${currentUser.token}`,
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Unable to load applications (${response.status})`);
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
          throw new Error("Unexpected applications response.");
        }

        setMyApplications(data);
      } catch (err) {
        if (err.name !== "AbortError") {
          setApplicationsError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setApplicationsLoading(false);
        }
      }
    }

    loadMyApplications();

    return () => controller.abort();
  }, [currentUser?.email, currentUser?.token]);
  const appliedJobsCount = myApplications.length;

  const shortlistedCount = myApplications.filter(
      (app) => app.status?.toLowerCase() === "shortlisted"
  ).length;

  const pendingCount = myApplications.filter(
      (app) => !app.status || app.status.toLowerCase() === "pending"
  ).length;

  const savedJobsCount = savedJobs.length;
  useEffect(() => {
    localStorage.setItem("savedJobs", JSON.stringify(savedJobs));
  }, [savedJobs]);

  const handleToggleSavedJob = (job) => {
    setSavedJobs((previousSavedJobs) => {
      const alreadySaved = previousSavedJobs.some(
          (savedJob) => String(savedJob.id) === String(job.id)
      );

      if (alreadySaved) {
        return previousSavedJobs.filter(
            (savedJob) => String(savedJob.id) !== String(job.id)
        );
      }

      return [...previousSavedJobs, job];
    });
  };

  // Apply for a job
  const handleApply = async (job) => {
    if (!currentUser?.token) {
      alert("Please login again to apply for this job.");
      return;
    }

    const confirmed = window.confirm(
        `Do you want to apply for ${job.title} at ${job.company}?`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
          "http://localhost:8080/api/applications",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${currentUser.token}`,
            },
            body: JSON.stringify({
              applicantName: currentUser.name,
              email: currentUser.email,
              resumeUrl: "",
              jobId: job.id,
            }),
          }
      );

      if (!response.ok) {
        const message = await response.text();
        throw new Error(
            message || `Application failed: ${response.status}`
        );
      }

      const updatedResponse = await fetch(
          "http://localhost:8080/api/applications/my?email=" +
          encodeURIComponent(currentUser.email),
          {
            headers: {
              Authorization: `Bearer ${currentUser.token}`,
            },
          }
      );
      if (updatedResponse.ok) {
        const updatedApplications = await updatedResponse.json();

        console.log("Applications from backend:", updatedApplications);

        setMyApplications(updatedApplications);
      } else {
        console.error(
            "Could not reload applications:",
            updatedResponse.status,
            await updatedResponse.text()
        );
      }

      alert(`Successfully applied for ${job.title}!`);
    } catch (err) {
      console.error("Apply error:", err);
      alert(
          err.message ||
          "Unable to apply. Please try again."
      );
    }
  };
// Upload or replace the profile resume
  const uploadProfileResume = async () => {
    if (!currentUser?.token) {
      alert("Please log in again.");
      return;
    }

    if (!selectedProfileResume) {
      alert("Please select your PDF resume.");
      return;
    }

    const file = selectedProfileResume;

    if (
        file.type !== "application/pdf" &&
        !file.name.toLowerCase().endsWith(".pdf")
    ) {
      alert("Please select a PDF file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Resume must be 5 MB or smaller.");
      return;
    }

    const formData = new FormData();
    formData.append("resume", file);

    try {
      setResumeUploading(true);

      const response = await fetch(
          "http://localhost:8080/api/profile/resume",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${currentUser.token}`,
            },
            body: formData,
          }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
            data.message || `Upload failed (${response.status})`
        );
      }

      setCurrentUser((previousUser) => ({
        ...previousUser,
        profileResumeFileName:
            data.profileResumeFileName || "resume.pdf",
      }));

      setSelectedProfileResume(null);

      const input = document.getElementById("profile-resume-upload");
      if (input) input.value = "";

      alert("Resume uploaded successfully!");
    } catch (error) {
      console.error("Resume upload error:", error);
      alert(error.message || "Unable to upload resume.");
    } finally {
      setResumeUploading(false);
    }
  };


// View the saved profile resume
  const viewProfileResume = async () => {
    if (!currentUser?.token) {
      alert("Please log in again.");
      return;
    }

    const newTab = window.open("", "_blank");

    if (!newTab) {
      alert("Please allow popups to view your resume.");
      return;
    }

    try {
      const response = await fetch(
          "http://localhost:8080/api/profile/resume",
          {
            headers: {
              Authorization: `Bearer ${currentUser.token}`,
            },
          }
      );

      if (!response.ok) {
        throw new Error(
            response.status === 404
                ? "No profile resume found."
                : `Unable to open resume (${response.status})`
        );
      }

      const pdfBlob = await response.blob();
      const pdfUrl = URL.createObjectURL(pdfBlob);
      newTab.location.href = pdfUrl;

      setTimeout(() => URL.revokeObjectURL(pdfUrl), 60000);
    } catch (error) {
      newTab.close();
      console.error("Resume viewing error:", error);
      alert(error.message || "Unable to view resume.");
    }
  };
  // Login and registration screen
  if (!isLoggedIn) {
if (showRegister) {
  return (
    <div className="register-page-wrapper">
      <button
        type="button"
        className="back-to-login-btn"
        onClick={() => setShowRegister(false)}
      >
        <span aria-hidden="true">←</span> Back to Login
      </button>

      <Register />
    </div>
  );
}

    return (
        <Login
            onLogin={(user) => {
              setCurrentUser(user);
              setIsLoggedIn(true);
            }}
            onRegister={() => setShowRegister(true)}
        />
    );
  }

  // Admin dashboard
  if (currentUser?.role === "ADMIN") {
    return (
        <AdminDashboard
            currentUser={currentUser}
            onLogout={() => {
              setIsLoggedIn(false);
              setCurrentUser(null);
              setShowRegister(false);
            }}
        />
    );
  }

  if (activeSection === "profile") {
    // Full Job Details Page
    if (showJobDetails && selectedJob) {
      return (
          <div className="app">
            <main className="main-content job-details-page">
              <button
                  type="button"
                  className="back-to-jobs-btn"
                  onClick={() => {
                    setShowJobDetails(false);
                    setSelectedJob(null);
                  }}
              >
                ← Back to Jobs
              </button>

              <section className="job-details-hero">
                <div className="company-logo">
                  {selectedJob.company?.charAt(0) || "J"}
                </div>

                <div>
                  <p className="job-details-label">JOB OPPORTUNITY</p>
                  <h1>{selectedJob.title || "Job Title"}</h1>
                  <h3>{selectedJob.company || "Company not specified"}</h3>
                  <p>📍 {selectedJob.location || "Location not specified"}</p>
                </div>
              </section>

              <section className="job-details-content">
                <div className="job-details-main-panel">
                  <h2>About the Job</h2>
                  <p className="job-description-text">
                    {selectedJob.description ||
                        "No job description has been provided by the recruiter."}
                  </p>

                  <h2>Job Information</h2>

                  <div className="job-information-grid">
                    <div>
                      <span>Company</span>
                      <strong>
                        {selectedJob.company || "Not specified"}
                      </strong>
                    </div>

                    <div>
                      <span>Job Location</span>
                      <strong>
                        {selectedJob.location || "Not specified"}
                      </strong>
                    </div>

                    <div>
                      <span>Salary Package</span>
                      <strong>
                        {selectedJob.salary || "Not specified"}
                      </strong>
                    </div>


                  </div>
                </div>

                <aside className="job-apply-panel">
                  <h2>Interested in this role?</h2>
                  <p>
                    Review the job information and submit your application.
                  </p>

                  <button
                      type="button"
                      className="job-apply-now-btn"
                      onClick={() => setShowJobDetails(false)}
                  >
                    Apply Now →
                  </button>
                </aside>
              </section>
            </main>
          </div>
      );
    }
    return (
        <div className="app">
          <aside className="sidebar">
            <h2 className="logo">
              Job<span>Portal</span>
            </h2>

            <p className="menu-title">MAIN MENU</p>

            <nav>
              <a href="#dashboard"
                 onClick={() => setActiveSection("dashboard")}>
                ▦ Dashboard
              </a>
              <a href="#jobs"
                 onClick={() => setActiveSection("jobs")}>
                💼 Browse Jobs
              </a>
              <a href="#applications"
                 onClick={() => setActiveSection("applications")}>
                📄 My Applications
              </a>
              <a href="#saved"
                 onClick={() => setActiveSection("saved")}>
                ♡ Saved Jobs
              </a>
              <a href="#profile" className="active">
                👤 My Profile
              </a>
            </nav>
          </aside>

          <main className="main-content">

            <section id="profile" className="profile-section">
              <div className="profile-page-heading">
                <div>
                  <p className="profile-eyebrow">ACCOUNT SETTINGS</p>
                  <h1>My Profile</h1>
                  <p>Manage your personal information and career details.</p>
                </div>
                <div className="profile-status">● Account Active</div>
              </div>

              <div className="profile-overview">
                <div className="profile-overview-avatar">
                  {currentUser?.name?.charAt(0)?.toUpperCase() || "U"}
                </div>
                <div className="profile-overview-info">
                  <h2>{currentUser?.name || "Name not available"}</h2>
                  <p>{currentUser?.email || "Email not available"}</p>
                  <span>Job Seeker</span>
                  <button
                      type="button"
                      className="edit-profile-btn"
                      onClick={() => {
                        setProfileForm({
                          name: currentUser?.name || "",
                          phone: currentUser?.phone || "",
                          location: currentUser?.location || "",
                          education: currentUser?.education || "",
                          skills: Array.isArray(currentUser?.skills)
                              ? currentUser.skills.join(", ")
                              : currentUser?.skills || "",
                          experience: currentUser?.experience || "",
                        });
                        setIsEditingProfile(true);
                      }}
                  >
                    {isEditingProfile ? "Cancel Editing" : "✏️ Edit Profile"}
                  </button>
                </div>
              </div>

              {isEditingProfile && (
                  <div className="profile-panel profile-edit-form">
                    <h2>Edit Your Profile</h2>
                    <p className="profile-panel-subtitle">
                      Update your personal and career details.
                    </p>

                    <div className="profile-info-grid">
                      <div className="profile-info-item">
                        <label>Full Name</label>
                        <input
                            value={profileForm.name}
                            onChange={(e) =>
                                setProfileForm({
                                  ...profileForm,
                                  name: e.target.value,
                                })
                            }
                            placeholder="Enter your full name"
                        />
                      </div>

                      <div className="profile-info-item">
                        <label>Phone Number</label>
                        <input
                            value={profileForm.phone}
                            onChange={(e) =>
                                setProfileForm({
                                  ...profileForm,
                                  phone: e.target.value,
                                })
                            }
                            placeholder="Enter phone number"
                        />
                      </div>

                      <div className="profile-info-item">
                        <label>Location</label>
                        <input
                            value={profileForm.location}
                            onChange={(e) =>
                                setProfileForm({
                                  ...profileForm,
                                  location: e.target.value,
                                })
                            }
                            placeholder="City, State"
                        />
                      </div>

                      <div className="profile-info-item">
                        <label>Education</label>
                        <input
                            value={profileForm.education}
                            onChange={(e) =>
                                setProfileForm({
                                  ...profileForm,
                                  education: e.target.value,
                                })
                            }
                            placeholder="Your qualification"
                        />
                      </div>

                      <div className="profile-info-item">
                        <label>Skills</label>
                        <input
                            value={profileForm.skills}
                            onChange={(e) =>
                                setProfileForm({
                                  ...profileForm,
                                  skills: e.target.value,
                                })
                            }
                            placeholder="Java, Spring Boot, React"
                        />
                      </div>

                      <div className="profile-info-item">
                        <label>Experience</label>
                        <input
                            value={profileForm.experience}
                            onChange={(e) =>
                                setProfileForm({
                                  ...profileForm,
                                  experience: e.target.value,
                                })
                            }
                            placeholder="Fresher or work experience"
                        />
                      </div>
                    </div>

                    <div className="profile-form-actions">
                      <button
                          type="button"
                          onClick={() => setIsEditingProfile(false)}
                      >
                        Cancel
                      </button>


                      <button
                          type="button"
                          onClick={async () => {
                            if (!currentUser?.token) {
                              alert("Please login again.");
                              return;
                            }

                            try {
                              const response = await fetch(
                                  "http://localhost:8080/api/profile",
                                  {
                                    method: "PUT",
                                    headers: {
                                      "Content-Type": "application/json",
                                      Authorization: `Bearer ${currentUser.token}`,
                                    },
                                    body: JSON.stringify({
                                      name: profileForm.name,
                                      phone: profileForm.phone,
                                      location: profileForm.location,
                                      education: profileForm.education,
                                      skills: profileForm.skills,
                                      experience: profileForm.experience,
                                    }),
                                  }
                              );

                              const data = await response.json();

                              if (!response.ok) {
                                throw new Error(
                                    data.message || `Update failed: ${response.status}`
                                );
                              }

                              setCurrentUser((previousUser) => ({
                                ...previousUser,
                                ...data,
                                token: previousUser.token,
                              }));

                              setIsEditingProfile(false);
                              alert("Profile updated successfully!");
                            } catch (error) {
                              alert(error.message || "Unable to update profile.");
                            }
                          }}
                      >
                        Save Changes
                      </button>

                    </div>
                  </div>
              )}


              <div className="profile-content-grid">
                <div className="profile-panel">
                  <h2>Personal Information</h2>
                  <p className="profile-panel-subtitle">
                    Your registered account details
                  </p>

                  <div className="profile-info-grid">
                    <div className="profile-info-item">
                      <label>Full Name</label>
                      <p>{currentUser?.name || "Not added"}</p>
                    </div>

                    <div className="profile-info-item">
                      <label>Email Address</label>
                      <p>{currentUser?.email || "Not added"}</p>
                    </div>

                    <div className="profile-info-item">
                      <label>Phone Number</label>
                      <p>{currentUser?.phone || "Not added yet"}</p>
                    </div>

                    <div className="profile-info-item">
                      <label>Location</label>
                      <p>{currentUser?.location || "Not added yet"}</p>
                    </div>
                  </div>
                </div>

                <div className="profile-panel">
                  <h2>Career Information</h2>
                  <p className="profile-panel-subtitle">
                    Information about your professional background
                  </p>

                  <div className="profile-info-grid">
                    <div className="profile-info-item">
                      <label>Account Role</label>
                      <p>{currentUser?.role || "JOB_SEEKER"}</p>
                    </div>

                    <div className="profile-info-item">
                      <label>Education</label>
                      <p>{currentUser?.education || "Not added yet"}</p>
                    </div>

                    <div className="profile-info-item">
                      <label>Skills</label>
                      <p>
                        {Array.isArray(currentUser?.skills)
                            ? currentUser.skills.join(", ")
                            : currentUser?.skills || "Not added yet"}
                      </p>
                    </div>

                    <div className="profile-info-item">
                      <label>Experience</label>
                      <p>{currentUser?.experience || "Not added yet"}</p>
                    </div>
                  </div>
                </div>


                <div className="profile-panel profile-resume-panel">
                  <div className="profile-resume-icon">📄</div>

                  <div className="profile-resume-info">
                    <h2>My Resume</h2>

                    {currentUser?.profileResumeFileName ? (
                        <>
                          <p>
                            ✅ Resume uploaded:
                            {" "}{currentUser.profileResumeFileName}
                          </p>

                          <button
                              type="button"
                              onClick={viewProfileResume}
                          >
                            View Resume ↗
                          </button>
                        </>
                    ) : (
                        <p>
                          No resume uploaded yet. Please upload your PDF resume.
                        </p>
                    )}

                    <label htmlFor="profile-resume-upload">
                      Upload or Replace Resume (PDF)
                    </label>

                    <input
                        id="profile-resume-upload"
                        type="file"
                        accept=".pdf,application/pdf"
                        onChange={(event) =>
                            setSelectedProfileResume(
                                event.target.files?.[0] || null
                            )
                        }
                    />

                    <button
                        type="button"
                        onClick={uploadProfileResume}
                        disabled={!selectedProfileResume || resumeUploading}
                    >
                      {resumeUploading ? "Uploading..." : "Upload Resume"}
                    </button>
                  </div>
                </div>

                <div className="profile-panel profile-account-panel">
                  <h2>Account Information</h2>
                  <div className="profile-info-item">
                    <label>Account Type</label>
                    <p>Job Seeker</p>
                  </div>
                  <div className="profile-info-item">
                    <label>Email</label>
                    <p>{currentUser?.email || "Not available"}</p>
                  </div>
                  <div className="profile-info-item">
                    <label>Profile Status</label>
                    <p className="profile-complete-status">
                      ● Account information displayed
                    </p>
                  </div>
                </div>
              </div>
            </section>

          </main>
        </div>
    );
  }
  if (showJobDetails && selectedJob) {
    return (
        <div className="app">
          <main className="main-content job-details-page">
            <button
                type="button"
                className="back-to-jobs-btn"
                onClick={() => {
                  setShowJobDetails(false);
                  setSelectedJob(null);
                }}
            >
              ← Back to Jobs
            </button>

            <section className="job-details-header">
              <div className="company-logo">
                {selectedJob.company?.charAt(0) || "J"}
              </div>

              <div>
                <p className="eyebrow">JOB DETAILS</p>
                <h1>{selectedJob.title || "Job Title"}</h1>
                <p>
                  {selectedJob.company || "Company not specified"}
                  {" · "}
                  {selectedJob.location || "Location not specified"}
                </p>
              </div>
            </section>

            <section className="job-details-card">
              <h2>Job Overview</h2>

              <div className="job-overview-grid">
                <div>
                  <strong>Company</strong>
                  <p>{selectedJob.company || "Not specified"}</p>
                </div>

                <div>
                  <strong>Location</strong>
                  <p>{selectedJob.location || "Not specified"}</p>
                </div>

                <div>
                  <strong>Salary</strong>
                  <p>{selectedJob.salary || "Not specified"}</p>
                </div>
              </div>

              <hr />

              <h2>Job Description</h2>
              <p className="job-description-text">
                {selectedJob.description || "No job description has been provided."}
              </p>

              <div className="job-details-actions">
                <button
                    type="button"
                    onClick={() => {
                      setShowJobDetails(false);
                      setShowApplyForm(true);
                    }}
                >
                  Apply Now
                </button>

                <button
                    type="button"
                    onClick={() => handleToggleSavedJob(selectedJob)}
                >
                  {savedJobs.some(
                      (savedJob) =>
                          String(savedJob.id) === String(selectedJob.id)
                  )
                      ? "♥ Saved"
                      : "♡ Save Job"}
                </button>
              </div>
            </section>
          </main>
        </div>
    );
  }
  // Job Seeker dashboard
  return (

      <div className="app">
        <aside className="sidebar">
          <h2 className="logo">
            Job<span>Portal</span>
          </h2>

          <p className="menu-title">MAIN MENU</p>


          <nav>
            <a
                href="#dashboard"
                className={activeSection === "dashboard" ? "active" : ""}
                onClick={() => setActiveSection("dashboard")}
            >
              ▦ Dashboard
            </a>

            <a
                href="#jobs"
                className={activeSection === "jobs" ? "active" : ""}
                onClick={() => setActiveSection("jobs")}
            >
              💼 Browse Jobs
            </a>

            <a
                href="#applications"
                className={activeSection === "applications" ? "active" : ""}
                onClick={() => setActiveSection("applications")}
            >
              📄 My Applications
            </a>

            <a
                href="#saved"
                className={activeSection === "saved" ? "active" : ""}
                onClick={() => setActiveSection("saved")}
            >
              ♡ Saved Jobs
            </a>

            <a
                href="#profile"
                className={activeSection === "profile" ? "active" : ""}
                onClick={() => setActiveSection("profile")}
            >
              👤 My Profile
            </a>
          </nav>


          <div className="sidebar-bottom">
            <p>Ready for your next opportunity?</p>
            <button
                type="button"
                onClick={() =>
                    document
                        .getElementById("jobs")
                        ?.scrollIntoView({ behavior: "smooth" })
                }
            >
              Explore Jobs
            </button>
          </div>
        </aside>

        <main className="main-content" id="dashboard">
          <header className="topbar">
            <div>
              <p>
                Welcome back, {currentUser?.name || "Job Seeker"}!
                Find your next career opportunity.
              </p>
            </div>

            <div className="user-info">
              <div className="avatar">
                {currentUser?.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div>
                <strong>{currentUser?.name || "Job Seeker"}</strong>
                <small>Job Seeker</small>
              </div>
            </div>

            <button
                type="button"
                className="logout-btn"
                onClick={() => {
                  setIsLoggedIn(false);
                  setCurrentUser(null);
                  setShowRegister(false);
                }}
            >
              Logout
            </button>
          </header>

          <section className="welcome-card">
            <div>
              <p className="eyebrow">
                YOUR CAREER JOURNEY STARTS HERE
              </p>
              <h2>Find a job that fits your ambition.</h2>
              <p>
                Explore opportunities, track applications, and take
                the next step in your career.
              </p>

              <button
                  type="button"
                  onClick={() =>
                      document
                          .getElementById("jobs")
                          ?.scrollIntoView({ behavior: "smooth" })
                  }
              >
                Explore Opportunities →
              </button>
            </div>

            <div className="welcome-icon">💼</div>
          </section>

          <section className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon purple">▤</div>
              <p>Applied Jobs</p>
              <h2>{applicationsLoading ? "..." : appliedJobsCount}</h2>
              <small>Jobs you've applied for</small>
            </div>

            <div className="stat-card">
              <div className="stat-icon blue">✓</div>
              <p>Shortlisted</p>
              <h2>{applicationsLoading ? "..." : shortlistedCount}</h2>
              <small>Applications shortlisted</small>
            </div>

            <div className="stat-card">
              <div className="stat-icon orange">◷</div>
              <p>Pending Reviews</p>
              <h2>{applicationsLoading ? "..." : pendingCount}</h2>
              <small>Awaiting recruiter response</small>
            </div>

            <div className="stat-card">
              <div className="stat-icon green">☆</div>
              <p>Saved Jobs</p>
              <h2>{savedJobsCount}</h2>
              <small>Jobs saved for later</small>
            </div>
            {applicationsError && (
                <p role="alert">{applicationsError}</p>
            )}
          </section>

          <section className="jobs-section" id="jobs">
            <div className="section-heading">
              <div>
                <h2>Recommended Jobs</h2>
                <p>
                  Explore opportunities for your career interests.
                </p>
              </div>

              <span className="job-count">
              {jobs.length} opportunities
            </span>
            </div>

            <div className="job-list">
              {loading && <p>Loading jobs...</p>}

              {error && (
                  <p className="error-message">{error}</p>
              )}

              {!loading && !error && jobs.length === 0 && (
                  <div className="empty-jobs">
                    <h3>No jobs available yet</h3>
                    <p>
                      New opportunities will appear here when
                      recruiters post jobs.
                    </p>
                  </div>
              )}

              {!loading &&
                  !error &&
                  jobs.map((job) => (
                      <article className="job-card" key={job.id}>
                        <div className="company-logo">
                          {job.company?.charAt(0) || "J"}
                        </div>

                        <div className="job-details">
                          <h3>{job.title}</h3>
                          <p>
                            {job.company} · {job.location}
                          </p>

                          <div className="tags">
                            <span>Job Opportunity</span>
                            <span>Full-time</span>
                          </div>
                        </div>

                        <div className="job-action">
                          <strong>
                            {job.salary || "Salary not specified"}
                          </strong>

                          <button
                              type="button"
                              className="view-details-btn"
                              onClick={() => {
                                setSelectedJob(job);
                                setShowJobDetails(true);
                                setShowApplyForm(false);
                              }}
                          >
                            View Details →
                          </button>
                          <button
                              type="button"
                              onClick={() => {
                                setSelectedJob(job);
                                setShowJobDetails(false);
                                setShowApplyForm(true);
                              }}
                          >
                            Apply Now
                          </button>
                          <button
                              type="button"
                              onClick={() => handleToggleSavedJob(job)}
                          >
                            {savedJobs.some(
                                (savedJob) => String(savedJob.id) === String(job.id)
                            )
                                ? "♥ Saved"
                                : "♡ Save Job"}
                          </button>
                        </div>
                      </article>
                  ))}
            </div>
          </section>

          <section id="applications">
            <Applications
                currentUser={currentUser}
                isAdmin={false}
                token={currentUser?.token}
            />
          </section>
          <section id="saved" className="jobs-section">
            <div className="section-heading">
              <div>
                <h2>Saved Jobs</h2>
                <p>Your bookmarked jobs for later.</p>
              </div>
              <span className="job-count">
      {savedJobs.length} saved
    </span>
            </div>

            {savedJobs.length === 0 ? (
                <div className="empty-jobs">
                  <h3>No saved jobs yet</h3>
                  <p>Click ♡ Save Job on any job to save it here.</p>
                </div>
            ) : (
                <div className="job-list">
                  {savedJobs.map((job) => (
                      <article className="job-card" key={job.id}>
                        <div className="company-logo">
                          {job.company?.charAt(0) || "J"}
                        </div>

                        <div className="job-details">
                          <h3>{job.title}</h3>
                          <p>{job.company} · {job.location}</p>

                          <div className="tags">
                            <span>Job Opportunity</span>
                            <span>Full-time</span>
                          </div>
                        </div>

                        <div className="job-action">
                          <strong>
                            {job.salary || "Salary not specified"}
                          </strong>

                          <button
                              type="button"
                              className="view-details-btn"
                              onClick={() => {
                                setSelectedJob(job);
                                setShowJobDetails(true);
                                setShowApplyForm(false);
                              }}
                          >
                            View Details →
                          </button>

                          <button
                              type="button"
                              onClick={() => {
                                setSelectedJob(job);
                                setShowApplyForm(true);
                                setShowJobDetails(false);
                              }}
                          >
                            Apply Now
                          </button>
                          <button
                              type="button"
                              onClick={() => handleToggleSavedJob(job)}
                          >
                            ♥ Remove
                          </button>
                        </div>
                      </article>
                  ))}
                </div>
            )}
          </section>

          <section id="dashboard-profile" className="profile-section">
            <div className="section-heading">
              <div>
                <h2>My Profile</h2>
                <p>View your personal account information.</p>
              </div>
            </div>

            <div className="profile-card">
              <div className="profile-header">
                <div className="profile-avatar">
                  {currentUser?.name?.charAt(0)?.toUpperCase() || "U"}
                </div>

                <div>
                  <h3>{currentUser?.name || "Name not available"}</h3>
                  <p>Job Seeker</p>
                </div>
              </div>

              <div className="profile-details">
                <div className="profile-field">
                  <label>Full Name</label>
                  <p>{currentUser?.name || "Not available"}</p>
                </div>

                <div className="profile-field">
                  <label>Email Address</label>
                  <p>{currentUser?.email || "Not available"}</p>
                </div>

                <div className="profile-field">
                  <label>Account Role</label>
                  <p>{currentUser?.role || "JOB_SEEKER"}</p>
                </div>

              </div>
            </div>
          </section>
          {showApplyForm && selectedJob && (
              <ApplyForm
                  job={selectedJob}
                  currentUser={currentUser}
                  onClose={() => {
                    setShowApplyForm(false);
                    setSelectedJob(null);
                  }}
                  onSuccess={async () => {
                    setShowApplyForm(false);
                    setSelectedJob(null);

                    try {
                      setApplicationsLoading(true);

                      const response = await fetch(
                          "http://localhost:8080/api/applications/my?email=" +
                          encodeURIComponent(currentUser.email),
                          {
                            headers: {
                              Authorization: `Bearer ${currentUser.token}`,
                            },
                          }
                      );

                      if (!response.ok) {
                        throw new Error("Unable to refresh applications.");
                      }

                      const data = await response.json();
                      setMyApplications(data);

                    } catch (error) {
                      console.error("Application refresh error:", error);
                      setApplicationsError(error.message);
                    } finally {
                      setApplicationsLoading(false);
                    }
                  }}
              />
          )}
        </main>
      </div>
  );
}

export default App;
