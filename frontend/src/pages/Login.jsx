import { useState } from "react";
import { api } from "../services/api";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("merchant@demo.com");
  const [password, setPassword] = useState("Demo@123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const { data } = await api.post("/auth/login", {
        email: email.trim(),
        password
      });

      localStorage.setItem(
        "revenue_token",
        data.token
      );

      localStorage.setItem(
        "merchant",
        JSON.stringify(data.merchant)
      );

      onLogin(data.merchant);
    } catch (error) {
      console.error("Login error:", error);

      if (error.response) {
        setError(
          error.response.data?.message ||
          "Login failed."
        );
      } else {
        setError(
          "Cannot connect to backend. Make sure backend is running on port 5000."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <form
        className="login-card"
        onSubmit={submit}
      >
        <div className="brand large">
          <span>◈</span> RevenueAI
        </div>

        <p className="muted">
          AI-powered revenue recovery
        </p>

        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            required
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            required
          />
        </label>

        {error && (
          <div className="error">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="primary full"
          disabled={loading}
        >
          {loading
            ? "Signing in..."
            : "Sign in"}
        </button>

        <div className="demo">
          Demo: merchant@demo.com / Demo@123
        </div>
      </form>
    </div>
  );
}