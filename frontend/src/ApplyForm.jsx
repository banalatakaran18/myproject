
import React, { useState } from "react";
import "./ApplyForm.css";

function ApplyForm({ job, currentUser, onClose, onSuccess }) {
    const [form, setForm] = useState({
        applicantName: currentUser?.name || "",
        email: currentUser?.email || "",
        phoneNumber: "",
        twelfthMarks: "",
        graduationMarks: "",
        currentQualification: "",
        technicalSkills: "",
    });

    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!currentUser?.token) {
            alert("Please login first.");
            return;
        }

        if (!currentUser?.profileResumeFileName) {
            alert("Please upload your resume from My Profile first.");
            return;
        }

        if (!job?.id) {
            alert("Job information is missing.");
            return;
        }

        if (!form.phoneNumber.trim()) {
            alert("Please enter your phone number.");
            return;
        }

        if (!form.twelfthMarks || Number(form.twelfthMarks) < 0 ||
            Number(form.twelfthMarks) > 100) {
            alert("Please enter valid Class 12 marks.");
            return;
        }

        if (
            form.graduationMarks !== "" &&
            (Number(form.graduationMarks) < 0 ||
                Number(form.graduationMarks) > 100)
        ) {
            alert("Please enter valid graduation marks.");
            return;
        }

        const data = new FormData();

        data.append("jobId", String(job.id));
        data.append("phoneNumber", form.phoneNumber.trim());
        data.append("twelfthMarks", form.twelfthMarks);

        if (form.graduationMarks.trim()) {
            data.append("graduationMarks", form.graduationMarks);
        }

        data.append(
            "currentQualification",
            form.currentQualification
        );

        data.append("technicalSkills", form.technicalSkills);

        try {
            setLoading(true);

            const response = await fetch(
                "http://localhost:8080/api/applications/from-profile",
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${currentUser.token}`,
                    },
                    body: data,
                }
            );

            if (!response.ok) {
                const message = await response.text();
                throw new Error(
                    message || `Application failed (${response.status})`
                );
            }

            alert("Application submitted successfully!");

            onSuccess?.();
            onClose?.();

        } catch (error) {
            console.error("Application error:", error);
            alert(error.message || "Could not submit application.");

        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="apply-overlay">
            <div className="apply-form-card">

                <button
                    type="button"
                    className="apply-close"
                    onClick={onClose}
                >
                    ✕
                </button>

                <h2>Job Application Form</h2>

                <p>
                    Applying for <strong>{job.title}</strong> at {job.company}
                </p>

                <form onSubmit={handleSubmit}>

                    <label>Full Name *</label>
                    <input
                        name="applicantName"
                        value={form.applicantName}
                        onChange={handleChange}
                        required
                    />

                    <label>Email Address *</label>
                    <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        required
                    />

                    <label>Phone Number *</label>
                    <input
                        type="tel"
                        name="phoneNumber"
                        value={form.phoneNumber}
                        onChange={handleChange}
                        required
                    />

                    <label>Class 12 (+2) Marks (%) *</label>
                    <input
                        type="number"
                        name="twelfthMarks"
                        min="0"
                        max="100"
                        step="0.01"
                        value={form.twelfthMarks}
                        onChange={handleChange}
                        required
                    />

                    <label>Graduation Marks (%)</label>
                    <input
                        type="number"
                        name="graduationMarks"
                        min="0"
                        max="100"
                        step="0.01"
                        value={form.graduationMarks}
                        onChange={handleChange}
                        placeholder="Enter if applicable"
                    />

                    <label>Current Qualification *</label>
                    <select
                        name="currentQualification"
                        value={form.currentQualification}
                        onChange={handleChange}
                        required
                    >
                        <option value="">Select qualification</option>
                        <option value="B.Tech CSE">B.Tech CSE</option>
                        <option value="B.Tech Other">B.Tech - Other Branch</option>
                        <option value="B.E.">B.E.</option>
                        <option value="MCA">MCA</option>
                        <option value="BCA">BCA</option>
                        <option value="Other">Other</option>
                    </select>

                    <label>Technical Skills</label>
                    <textarea
                        name="technicalSkills"
                        value={form.technicalSkills}
                        onChange={handleChange}
                        placeholder="Java, Spring Boot, React, SQL..."
                    />

                    <label>Profile Resume</label>

                    <div className="profile-resume-preview">
                        {currentUser?.profileResumeFileName ? (
                            <p>
                                📄 {currentUser.profileResumeFileName}
                                <span> ✓ Ready to submit</span>
                            </p>
                        ) : (
                            <p>
                                No resume uploaded. Please upload it from
                                My Profile first.
                            </p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={
                            loading ||
                            !currentUser?.profileResumeFileName
                        }
                    >
                        {loading ? "Submitting..." : "Submit Application"}
                    </button>

                </form>
            </div>
        </div>
    );
}

export default ApplyForm;
