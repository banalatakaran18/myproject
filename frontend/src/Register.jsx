
import { useState } from "react";
import "./Register.css";
function Register() {
    const [form, setForm] = useState({
        name: "",
        email: "",
        password: ""
    });

    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage("");
        setLoading(true);

        try {
            const response = await fetch(
                "http://localhost:8080/api/auth/register",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(form)
                }
            );

            const result = await response.text();

            if (response.ok) {
                setMessage("Registration successful! You can now log in.");
                setForm({ name: "", email: "", password: "" });
            } else {
                setMessage(result || "Registration failed.");
            }
        } catch (error) {
            setMessage("Backend se connection nahi ho raha. Check karo ki Spring Boot running hai.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="register-container">
            <form className="register-form" onSubmit={handleSubmit}>
                <h2>Create Job Seeker Account</h2>
                <p>Register to explore and apply for jobs.</p>

                <label>Full Name</label>
                <input
                    name="name"
                    type="text"
                    placeholder="Enter your full name"
                    value={form.name}
                    onChange={handleChange}
                    required
                />

                <label>Email Address</label>
                <input
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    value={form.email}
                    onChange={handleChange}
                    required
                />

                <label>Password</label>
                <input
                    name="password"
                    type="password"
                    placeholder="Create a password"
                    value={form.password}
                    onChange={handleChange}
                    minLength={8}
                    required
                />

                <button type="submit" disabled={loading}>
                    {loading ? "Registering..." : "Create Account"}
                </button>

                {message && <p role="status">{message}</p>}
            </form>
        </div>
    );
}

export default Register;
