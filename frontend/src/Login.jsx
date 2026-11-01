
import { useState } from "react";
import "./Login.css";

function Login({ onLogin, onRegister }) {
    const [role, setRole] = useState("JOB_SEEKER");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailPattern.test(email.trim())) {
            setMessage("Please enter a valid email address, e.g. example@gmail.com");
            return;
        }
        setMessage("");
        setLoading(true);

        try {
            const response = await fetch(
                "http://localhost:8080/api/auth/login",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ email, password })
                }
            );

            const result = await response.json();

            if (!response.ok) {
                setMessage(result.message || "Invalid email or password");
                return;
            }

            if (result.role !== role) {
                setMessage(
                    `This account is registered as ${result.role.replace("_", " ")}. Please select the correct role.`
                );
                return;
            }

            onLogin(result);
        } catch (error) {
            setMessage("Backend connection failed. Please check Spring Boot.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <h1>Job Portal</h1>
                <p className="login-subtitle">
                    Find opportunities. Build your future.
                </p>

                <h2>Welcome Back!</h2>
                <p>Login to continue</p>

                <div className="role-options">
                    <button
                        type="button"
                        className={role === "JOB_SEEKER" ? "active" : ""}
                        onClick={() => setRole("JOB_SEEKER")}
                    >
                        Job Seeker
                    </button>

                    <button
                        type="button"
                        className={role === "ADMIN" ? "active" : ""}
                        onClick={() => setRole("ADMIN")}
                    >
                        Admin
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <label>Email Address</label>
                    <input
                        type="email"
                        placeholder="example@gmail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value.trim())}
                        autoComplete="username"
                        required
                        maxLength={254}
                        title="Please enter a valid email address, e.g. example@gmail.com"
                    />

                    <label>Password</label>
                    <input
                        type="password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />

                    <button type="submit" disabled={loading}>
                        {loading ? "Logging in..." : "Login"}
                    </button>
                </form>

                {message && <p className="login-message">{message}</p>}

                <p className="register-link">
                    New to Job Portal?{" "}
                    <button type="button" onClick={onRegister}>
                        Register as Job Seeker
                    </button>
                </p>
            </div>
        </div>
    );
}

export default Login;
