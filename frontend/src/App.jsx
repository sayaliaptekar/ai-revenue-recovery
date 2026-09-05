import { useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";

import Sidebar from "./components/Sidebar";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Payments from "./pages/Payments";
import Analysis from "./pages/Analysis";
import Simulator from "./pages/Simulator";
import Analytics from "./pages/Analytics";
import RevenueRecovery from "./pages/RevenueRecovery";
import Customers from "./pages/Customers";
import AuditTrail from "./pages/AuditTrail";

function Shell({ onLogout }) {
  const navigate = useNavigate();
  const [analysisId, setAnalysisId] = useState(null);

  function logout() {
    localStorage.clear();
    onLogout();
    navigate("/login");
  }

  return (
    <div className="app-shell">
      <Sidebar onLogout={logout} />

      <main className="main">
        <Routes>

          {/* Dashboard */}
          <Route
            path="/"
            element={<Dashboard />}
          />

          {/* Failed Payments */}
          <Route
            path="/payments"
            element={
              <Payments
                onAnalyze={(id) => {
                  setAnalysisId(id);
                  navigate("/analysis");
                }}
              />
            }
          />

          {/* AI Analysis */}
          <Route
            path="/analysis"
            element={
              analysisId ? (
                <Analysis
                  id={analysisId}
                  onBack={() => navigate("/payments")}
                />
              ) : (
                <Payments
                  onAnalyze={(id) => {
                    setAnalysisId(id);
                    navigate("/analysis");
                  }}
                />
              )
            }
          />

          {/* Revenue Recovery */}
          <Route
            path="/recovery"
            element={<RevenueRecovery />}
          />

          {/* Customers */}
          <Route
            path="/customers"
            element={<Customers />}
          />

          {/* Analytics */}
          <Route
            path="/analytics"
            element={<Analytics />}
          />

          {/* Simulator */}
          <Route
            path="/simulator"
            element={<Simulator />}
          />

          {/* Audit Trail */}
          <Route
            path="/audit"
            element={<AuditTrail />}
          />

        </Routes>
      </main>
    </div>
  );
}

export default function App() {

  const [loggedIn, setLoggedIn] = useState(
    Boolean(localStorage.getItem("revenue_token"))
  );

  /* NOT LOGGED IN */
  if (!loggedIn) {
    return (
      <Routes>
        <Route
          path="*"
          element={
            <Login
              onLogin={() => {
                setLoggedIn(true);
              }}
            />
          }
        />
      </Routes>
    );
  }

  /* LOGGED IN */
  return (
    <Shell
      onLogout={() => {
        setLoggedIn(false);
      }}
    />
  );
}