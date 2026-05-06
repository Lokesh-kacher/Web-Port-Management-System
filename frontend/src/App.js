import React from "react";
import PortForm from "./components/PortForm";
import AuthForm from "./components/AuthForm";
import "./App.css";

function App() {
  const [authData, setAuthData] = React.useState(() => {
    const raw = localStorage.getItem("wps-auth");
    return raw ? JSON.parse(raw) : null;
  });

  const handleAuthSuccess = React.useCallback((data) => {
    const nextAuth = { token: data.token, user: data.user };
    localStorage.setItem("wps-auth", JSON.stringify(nextAuth));
    setAuthData(nextAuth);
  }, []);

  const handleLogout = React.useCallback(() => {
    localStorage.removeItem("wps-auth");
    setAuthData(null);
  }, []);

  return (
    <div className="app-shell min-h-screen py-10 px-4">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 text-center fade-in-up">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
            Web Port Management System
          </h1>
          <p className="text-slate-600 mt-2">
            Manage ports, monitor activity, and analyze usage history.
          </p>
        </header>
        {!authData?.token ? (
          <AuthForm onAuthSuccess={handleAuthSuccess} />
        ) : (
          <PortForm token={authData.token} user={authData.user} onLogout={handleLogout} />
        )}
      </div>
    </div>
  );
}

export default App;