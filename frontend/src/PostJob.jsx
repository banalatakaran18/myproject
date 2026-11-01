
import { useEffect, useState } from "react";

const emptyForm = {
    title: "",
    company: "",
    location: "",
    description: "",
    salary: "",
};

function PostJob({ onJobCreated, token }) {    const [form, setForm] = useState(emptyForm);
    const [jobs, setJobs] = useState([]);
    const [message, setMessage] = useState("");
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);

    async function loadJobs() {
        try {
            const response = await fetch("http://localhost:8080/api/jobs");
            if (!response.ok) throw new Error();
            setJobs(await response.json());
        } catch {
            setMessage("Could not load jobs. Check the backend.");
        }
    }

    useEffect(() => {
        loadJobs();
    }, []);

    function handleChange(event) {
        setForm({ ...form, [event.target.name]: event.target.value });
    }

    function startEdit(job) {
        setEditingId(job.id);
        setForm({
            title: job.title || "",
            company: job.company || "",
            location: job.location || "",
            description: job.description || "",
            salary: job.salary || "",
        });
        setMessage("");
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function cancelEdit() {
        setEditingId(null);
        setForm({ ...emptyForm });
        setMessage("");
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setSaving(true);
        setMessage("");

        try {
            const response = await fetch(
                editingId
                    ? `http://localhost:8080/api/jobs/${editingId}`
                    : "http://localhost:8080/api/jobs",
                {
                    method: editingId ? "PUT" : "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(form),
                }
            );

            if (!response.ok) {
                throw new Error("Request failed");
            }

            const result = await response.json().catch(() => null);

            setMessage(editingId ? "Job updated successfully!" : "Job posted successfully!");
            setForm({ ...emptyForm });
            setEditingId(null);

            if (onJobCreated && result) onJobCreated(result);
            await loadJobs();
        } catch {
            setMessage("Operation failed. Check your backend.");
        } finally {
            setSaving(false);
        }
    }

    async function deleteJob(id) {
        if (!window.confirm("Are you sure you want to delete this job?")) return;

        try {

            const response = await fetch(
                `http://localhost:8080/api/jobs/${id}`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) throw new Error();

            if (editingId === id) cancelEdit();
            setMessage("Job deleted successfully!");
            await loadJobs();
        } catch {
            setMessage("Could not delete job. Check your backend.");
        }
    }

    return (
        <section className="post-job-section">
            <h2>{editingId ? "Edit Job" : "Post a New Job"}</h2>
            <p>{editingId ? "Update the job details below." : "Add an opportunity to your job portal."}</p>

            <form className="post-job-form" onSubmit={handleSubmit}>
                <input name="title" placeholder="Job Title" value={form.title} onChange={handleChange} required />
                <input name="company" placeholder="Company Name" value={form.company} onChange={handleChange} required />
                <input name="location" placeholder="Job Location" value={form.location} onChange={handleChange} required />
                <input name="salary" placeholder="Salary (e.g. 4-8 LPA)" value={form.salary} onChange={handleChange} />
                <textarea name="description" placeholder="Job Description" value={form.description} onChange={handleChange} required rows="4" />

                <div className="job-form-actions">
                    <button type="submit" disabled={saving}>
                        {saving ? "Saving..." : editingId ? "Update Job" : "Post Job"}
                    </button>
                    {editingId && (
                        <button type="button" className="cancel-job-btn" onClick={cancelEdit}>
                            Cancel Edit
                        </button>
                    )}
                </div>

                {message && <p role="status">{message}</p>}
            </form>

            <div className="manage-jobs-heading">
                <h2>Manage Jobs</h2>
                <button type="button" onClick={loadJobs}>Refresh Jobs</button>
            </div>

            {jobs.length === 0 ? (
                <p>No jobs available yet.</p>
            ) : (
                <div className="manage-jobs-list">
                    {jobs.map((job) => (
                        <article className="manage-job-card" key={job.id}>
                            <div>
                                <h3>{job.title}</h3>
                                <p>{job.company} · {job.location}</p>
                                <p>{job.salary || "Salary not specified"}</p>
                            </div>
                            <div className="manage-job-actions">
                                <button type="button" onClick={() => startEdit(job)}>Edit</button>
                                <button type="button" className="delete-job-btn" onClick={() => deleteJob(job.id)}>Delete</button>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
}

export default PostJob;
