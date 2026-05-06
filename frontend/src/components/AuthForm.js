import React, { useState } from "react";
import axios from "axios";

const API_BASE_URL = "http://localhost:5000/api";

const AuthForm = ({ onAuthSuccess }) => {
  const [isRegister, setIsRegister] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (isRegister && !name.trim()) {
      setError("Name is required.");
      return;
    }

    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }

    try {
      setLoading(true);
      const endpoint = isRegister ? "register" : "login";
      const payload = isRegister ? { name, email, password } : { email, password };

      const res = await axios.post(`${API_BASE_URL}/auth/${endpoint}`, payload);
      onAuthSuccess(res.data);
    } catch (err) {
      setError(err?.response?.data?.error || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto glass-card rounded-2xl p-6 shadow-xl fade-in-up">
      <h2 className="text-2xl font-bold text-slate-900 text-center">
        {isRegister ? "Create Account" : "Login"}
      </h2>
      <p className="text-sm text-slate-600 text-center mt-1">
        {isRegister ? "Register first to access port dashboard." : "Login to continue."}
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-3">
        {isRegister && (
          <input
            type="text"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
        />

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 transition text-white py-2 rounded-lg"
        >
          {loading ? "Please wait..." : isRegister ? "Register" : "Login"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => setIsRegister((prev) => !prev)}
        className="mt-4 w-full text-sm text-blue-600 hover:text-blue-700"
      >
        {isRegister ? "Already have an account? Login" : "New here? Register first"}
      </button>
    </div>
  );
};

export default AuthForm;
