import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";

const API_BASE_URL = "http://localhost:5000/api";

const PortForm = ({ token, user, onLogout }) => {
  const [name, setName] = useState("");
  const [port, setPort] = useState("");
  const [searchPort, setSearchPort] = useState("");
  const [ports, setPorts] = useState([]);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("wps-dark-mode") === "1");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [checkingAll, setCheckingAll] = useState(false);

  const resetForm = () => {
    setName("");
    setPort("");
    setEditingId(null);
  };

  const fetchData = useCallback(async () => {
    const config = {
      headers: { Authorization: `Bearer ${token}` },
    };

    const [portsRes, historyRes, statsRes] = await Promise.all([
      axios.get(`${API_BASE_URL}/all`, config),
      axios.get(`${API_BASE_URL}/history`, config),
      axios.get(`${API_BASE_URL}/history/stats`, config),
    ]);

    setPorts(portsRes.data);
    setHistory(historyRes.data);
    setStats(statsRes.data);
  }, [token]);

  useEffect(() => {
    fetchData().catch(() => {
      setError("Unable to connect backend or your session expired.");
    });
  }, [fetchData]);

  useEffect(() => {
    localStorage.setItem("wps-dark-mode", darkMode ? "1" : "0");
  }, [darkMode]);

  useEffect(() => {
    if (!autoRefresh) return undefined;

    const intervalId = setInterval(async () => {
      try {
        const config = {
          headers: { Authorization: `Bearer ${token}` },
        };
        const listRes = await axios.get(`${API_BASE_URL}/all`, config);
        const ids = listRes.data.map((item) => item._id).filter(Boolean);
        await Promise.all(ids.map((id) => axios.get(`${API_BASE_URL}/${id}/status`, config)));
        await fetchData();
      } catch (err) {
        if (err?.response?.status === 401) {
          onLogout();
          return;
        }
        setError("Auto-refresh failed. Check backend connection.");
      }
    }, 30000);

    return () => clearInterval(intervalId);
  }, [autoRefresh, fetchData, onLogout, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim() || !port) {
      setError("Please enter both port name and port number.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      if (editingId) {
        await axios.put(
          `${API_BASE_URL}/${editingId}`,
          { name, port },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSuccess("Port updated successfully.");
      } else {
        await axios.post(
          `${API_BASE_URL}/add`,
          { name, port },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSuccess("Port added successfully.");
      }

      resetForm();
      await fetchData();
    } catch (err) {
      const message = err?.response?.data?.error || "Request failed.";
      if (err?.response?.status === 401) {
        onLogout();
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item._id);
    setName(item.name);
    setPort(String(item.port));
    setError("");
    setSuccess("");
  };

  const handleDelete = async (id) => {
    if (!id) {
      setError("Invalid port id. Refresh and try again.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");
      await axios.delete(`${API_BASE_URL}/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess("Port deleted successfully.");
      await fetchData();
    } catch (err) {
      const message = err?.response?.data?.error || "Delete failed.";
      if (err?.response?.status === 401) {
        onLogout();
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckStatus = async (id) => {
    if (!id) {
      setError("Invalid port id. Refresh and try again.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");
      await axios.get(`${API_BASE_URL}/${id}/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess("Port status checked.");
      await fetchData();
    } catch (err) {
      const message = err?.response?.data?.error || "Status check failed.";
      if (err?.response?.status === 401) {
        onLogout();
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckAllStatuses = async () => {
    try {
      setCheckingAll(true);
      setError("");
      setSuccess("");

      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };
      const listRes = await axios.get(`${API_BASE_URL}/all`, config);
      const ids = listRes.data.map((item) => item._id).filter(Boolean);

      if (ids.length === 0) {
        setSuccess("No saved ports to check.");
        return;
      }

      await Promise.all(ids.map((id) => axios.get(`${API_BASE_URL}/${id}/status`, config)));
      await fetchData();
      setSuccess("All port statuses checked successfully.");
    } catch (err) {
      const message = err?.response?.data?.error || "Check all failed.";
      if (err?.response?.status === 401) {
        onLogout();
      }
      setError(message);
    } finally {
      setCheckingAll(false);
    }
  };

  const filteredPorts = ports.filter((item) =>
    String(item.port).includes(searchPort.trim())
  );

  const statusBadgeClass = (status) => {
    if (status === "active") return "bg-emerald-500";
    if (status === "inactive") return "bg-rose-500";
    return "bg-slate-500";
  };

  const activeCount = ports.filter((item) => item.isActive === "active").length;
  const inactiveCount = ports.filter((item) => item.isActive === "inactive").length;
  const topPort = stats[0]?.port ?? "-";

  const requireDeleteConfirm = (item) => {
    const confirmed = window.confirm(
      `Delete ${item.name || "this port"} (${item.port})? This action cannot be undone.`
    );

    if (confirmed) {
      handleDelete(item._id);
    }
  };

  return (
    <div className={`${darkMode ? "dark-theme" : ""} rounded-2xl`}>
      <div className="flex justify-end mb-4 gap-2">
        <div className="mr-auto text-sm text-slate-600 self-center">
          Logged in as <span className="font-semibold">{user?.name || user?.email}</span>
        </div>
        <button
          type="button"
          onClick={handleCheckAllStatuses}
          disabled={checkingAll}
          className="px-3 py-2 rounded-lg text-sm bg-indigo-600 text-white disabled:opacity-60"
        >
          {checkingAll ? "Checking All..." : "Check All Now"}
        </button>
        <button
          type="button"
          onClick={() => setAutoRefresh((value) => !value)}
          className={`px-3 py-2 rounded-lg text-sm text-white ${autoRefresh ? "bg-emerald-600" : "bg-slate-600"}`}
        >
          {autoRefresh ? "Auto Refresh: ON" : "Auto Refresh: OFF"}
        </button>
        <button
          type="button"
          onClick={onLogout}
          className="px-3 py-2 rounded-lg text-sm bg-rose-600 text-white"
        >
          Logout
        </button>
        <button
          type="button"
          onClick={() => setDarkMode((value) => !value)}
          className="px-3 py-2 rounded-lg text-sm bg-slate-900 text-white"
        >
          {darkMode ? "Light Mode" : "Dark Mode"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <section className="lg:col-span-2 glass-card rounded-2xl shadow-xl p-5 fade-in-up">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-2xl font-bold text-slate-900">Manage Ports</h2>
          <span className="text-sm bg-slate-900 text-white px-3 py-1 rounded-full">
            Total: {ports.length}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
            <p className="text-xs text-blue-700">Saved Ports</p>
            <p className="text-xl font-bold text-blue-900">{ports.length}</p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
            <p className="text-xs text-emerald-700">Active</p>
            <p className="text-xl font-bold text-emerald-900">{activeCount}</p>
          </div>
          <div className="bg-rose-50 rounded-xl p-3 border border-rose-100">
            <p className="text-xs text-rose-700">Inactive</p>
            <p className="text-xl font-bold text-rose-900">{inactiveCount}</p>
          </div>
          <div className="bg-violet-50 rounded-xl p-3 border border-violet-100">
            <p className="text-xs text-violet-700">Top Used Port</p>
            <p className="text-xl font-bold text-violet-900">{topPort}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input
            type="text"
            placeholder="Port name (e.g. HTTP)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <input
            type="number"
            placeholder="Port number"
            value={port}
            onChange={(e) => setPort(e.target.value)}
            className="p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 transition text-white px-4 rounded-lg"
          >
            {loading ? "Saving..." : editingId ? "Update" : "Add"}
          </button>
        </form>

        {editingId && (
          <button
            type="button"
            onClick={resetForm}
            className="mt-3 px-4 py-2 text-sm bg-slate-200 hover:bg-slate-300 transition rounded-lg"
          >
            Cancel Edit
          </button>
        )}

        {error && <p className="text-rose-600 mt-3 text-sm">{error}</p>}
        {success && <p className="text-emerald-600 mt-3 text-sm">{success}</p>}

        <div className="mt-6">
          <input
            type="number"
            placeholder="Search by port number"
            value={searchPort}
            onChange={(e) => setSearchPort(e.target.value)}
            className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
        </div>

        <div className="mt-4 space-y-3">
          {filteredPorts.map((item) => (
            <div
              key={item._id}
              className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm hover:shadow-md transition fade-in-up"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{item.name || "Unnamed Port"}</p>
                  <p className="text-sm text-slate-500">Port: {item.port}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className={`text-white text-xs px-2 py-1 rounded-full ${statusBadgeClass(item.isActive)} ${item.isActive === "active" ? "pulse-soft" : ""}`}
                    >
                      {item.isActive || "unknown"}
                    </span>
                    {item.lastCheckedAt && (
                      <span className="text-xs text-slate-500">
                        Checked: {new Date(item.lastCheckedAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleCheckStatus(item._id)}
                    className="bg-indigo-600 hover:bg-indigo-700 transition text-white px-3 py-1 rounded-lg text-sm"
                  >
                    Check
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEdit(item)}
                    className="bg-amber-500 hover:bg-amber-600 transition text-white px-3 py-1 rounded-lg text-sm"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => requireDeleteConfirm(item)}
                    className="bg-rose-500 hover:bg-rose-600 transition text-white px-3 py-1 rounded-lg text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filteredPorts.length === 0 && (
            <p className="text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3">
              No ports match this search.
            </p>
          )}
        </div>
      </section>

      <aside className="space-y-6">
        <section className="glass-card rounded-2xl shadow-lg p-5 fade-in-up">
          <h3 className="text-lg font-semibold text-slate-900">Most Used Ports</h3>
          <div className="mt-3 space-y-2 text-left">
            {stats.length === 0 && (
              <p className="text-sm text-slate-500">No usage data available yet.</p>
            )}
            {stats.map((item) => (
              <div key={item.port} className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                <p className="font-medium text-slate-900">Port {item.port}</p>
                <p className="text-sm text-slate-600">Used {item.count} times</p>
                <div className="mt-2 h-2 w-full bg-blue-100 rounded-full overflow-hidden">
                  <div
                    className="h-2 bg-blue-500 transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        100,
                        (item.count / Math.max(...stats.map((stat) => stat.count), 1)) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="glass-card rounded-2xl shadow-lg p-5 fade-in-up">
          <h3 className="text-lg font-semibold text-slate-900">Status Overview</h3>
          <div className="mt-4 space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-emerald-700">Active</span>
                <span className="text-slate-600">{activeCount}</span>
              </div>
              <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-3 bg-emerald-500 transition-all duration-500"
                  style={{
                    width: `${ports.length ? (activeCount / ports.length) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-rose-700">Inactive</span>
                <span className="text-slate-600">{inactiveCount}</span>
              </div>
              <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-3 bg-rose-500 transition-all duration-500"
                  style={{
                    width: `${ports.length ? (inactiveCount / ports.length) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="glass-card rounded-2xl shadow-lg p-5 fade-in-up">
          <h3 className="text-lg font-semibold text-slate-900">Recent History</h3>
          <div className="mt-3 space-y-2 text-left max-h-80 overflow-y-auto pr-1">
            {history.length === 0 && <p className="text-sm text-slate-500">No history yet.</p>}
            {history.map((entry) => (
              <div key={entry._id} className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <p className="text-sm font-medium text-slate-800">
                  {entry.action.toUpperCase()} - {entry.name} (Port {entry.port})
                </p>
                <p className="text-xs text-slate-500">{new Date(entry.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </section>
      </aside>
    </div>
    </div>
  );
};

export default PortForm;



