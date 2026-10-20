
import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../context/user-context";

export default function Login() {
  const { login } = useContext(UserContext);
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const user = await login(email, password);

      if (user.role === "Teacher") {
        navigate("/teacher");
      } else if (user.role === "Student") {
        navigate("/student");
      } else {
        setError("Unknown user role");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit} className="login-form">
        <h1>Course Management System</h1>
        <h2>Login</h2>

        {error && <p className="error">{error}</p>}

        <label>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit" disabled={submitting}>
          {submitting ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}
