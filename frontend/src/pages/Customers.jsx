import { useEffect, useState } from "react";
import axios from "axios";

const API_URL = "http://localhost:5000/api";

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    segment: "REGULAR",
    lifetime_value: "",
    success_rate: "",
  });

  const fetchCustomers = async () => {
    try {
      const token = localStorage.getItem("revenue_token");

      const res = await axios.get(`${API_URL}/customers`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setCustomers(res.data);
    } catch (error) {
      console.error("Customer fetch error:", error);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !form.name ||
      !form.email ||
      !form.lifetime_value ||
      !form.success_rate
    ) {
      alert("Please fill all fields.");
      return;
    }

    if (
      Number(form.success_rate) < 0 ||
      Number(form.success_rate) > 100
    ) {
      alert("Success rate must be between 0 and 100.");
      return;
    }

    try {
      setLoading(true);

      // IMPORTANT: Login.jsx stores token as revenue_token
      const token = localStorage.getItem("revenue_token");

      if (!token) {
        alert("Session expired. Please login again.");
        return;
      }

      await axios.post(
        `${API_URL}/customers`,
        {
          name: form.name,
          email: form.email,
          segment: form.segment,
          lifetime_value: Number(form.lifetime_value),
          success_rate: Number(form.success_rate),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      alert("Customer added successfully!");

      setForm({
        name: "",
        email: "",
        segment: "REGULAR",
        lifetime_value: "",
        success_rate: "",
      });

      setShowForm(false);

      await fetchCustomers();
    } catch (error) {
      console.error("Add customer error:", error);

      alert(
        error.response?.data?.message ||
          "Failed to add customer."
      );
    } finally {
      setLoading(false);
    }
  };

  const totalCustomers = customers.length;

  const highValueCustomers = customers.filter(
    (c) => Number(c.lifetime_value) >= 50000
  ).length;

  const atRiskCustomers = customers.filter(
    (c) => Number(c.failed_payments || 0) > 0
  ).length;

  const totalRecoveredRevenue = customers.reduce(
    (sum, c) =>
      sum + Number(c.recovered_revenue || 0),
    0
  );

  const opportunities = [...customers]
    .filter(
      (c) => Number(c.failed_payments || 0) > 0
    )
    .sort(
      (a, b) =>
        Number(b.lifetime_value) -
        Number(a.lifetime_value)
    )
    .slice(0, 3);

  return (
    <div className="customers-container">

      {/* ================= HEADER ================= */}

      <div className="customers-header">

        <div>
          <div className="customers-eyebrow">
            <span></span>
            CUSTOMER INTELLIGENCE
          </div>

          <h1>Customers</h1>

          <p>
            Monitor customer value, payment risk and
            recovery opportunities.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: "10px",
            alignItems: "center",
          }}
        >

          <div className="customers-status">
            <span></span>
            RevenueAI Active
          </div>

          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              border: "none",
              borderRadius: "10px",
              padding: "11px 17px",
              background: "#315bea",
              color: "#fff",
              fontSize: "12px",
              fontWeight: "800",
              cursor: "pointer",
            }}
          >
            {showForm ? "Cancel" : "+ Add Customer"}
          </button>

        </div>
      </div>


      {/* ================= ADD CUSTOMER ================= */}

      {showForm && (
        <div
          style={{
            background: "#fff",
            border: "1px solid #e3e8ef",
            borderRadius: "16px",
            padding: "22px",
            marginBottom: "20px",
            boxShadow: "0 5px 18px rgba(16,24,40,.035)",
          }}
        >

          <div style={{ marginBottom: "18px" }}>

            <h2
              style={{
                margin: 0,
                color: "#172033",
                fontSize: "18px",
                fontWeight: "900",
              }}
            >
              Add New Customer
            </h2>

            <p
              style={{
                margin: "5px 0 0",
                color: "#667085",
                fontSize: "11px",
              }}
            >
              Add a merchant customer manually to RevenueAI.
            </p>

          </div>

          <form
            onSubmit={handleSubmit}
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "15px",
            }}
          >

            {/* NAME */}

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "6px",
                  color: "#475467",
                  fontSize: "11px",
                  fontWeight: "800",
                }}
              >
                Customer Name
              </label>

              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Rahul Patil"
                required
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "11px 12px",
                  border: "1px solid #dfe4eb",
                  borderRadius: "9px",
                  outline: "none",
                  fontSize: "12px",
                }}
              />
            </div>


            {/* EMAIL */}

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "6px",
                  color: "#475467",
                  fontSize: "11px",
                  fontWeight: "800",
                }}
              >
                Email
              </label>

              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="customer@example.com"
                required
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "11px 12px",
                  border: "1px solid #dfe4eb",
                  borderRadius: "9px",
                  outline: "none",
                  fontSize: "12px",
                }}
              />
            </div>


            {/* SEGMENT */}

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "6px",
                  color: "#475467",
                  fontSize: "11px",
                  fontWeight: "800",
                }}
              >
                Segment
              </label>

              <select
                name="segment"
                value={form.segment}
                onChange={handleChange}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "11px 12px",
                  border: "1px solid #dfe4eb",
                  borderRadius: "9px",
                  background: "#fff",
                  fontSize: "12px",
                }}
              >
                <option value="REGULAR">
                  REGULAR
                </option>

                <option value="HIGH_VALUE">
                  HIGH_VALUE
                </option>

                <option value="VIP">
                  VIP
                </option>
              </select>
            </div>


            {/* LTV */}

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "6px",
                  color: "#475467",
                  fontSize: "11px",
                  fontWeight: "800",
                }}
              >
                Lifetime Value (₹)
              </label>

              <input
                type="number"
                name="lifetime_value"
                value={form.lifetime_value}
                onChange={handleChange}
                placeholder="50000"
                min="0"
                required
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "11px 12px",
                  border: "1px solid #dfe4eb",
                  borderRadius: "9px",
                  outline: "none",
                  fontSize: "12px",
                }}
              />
            </div>


            {/* SUCCESS RATE */}

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "6px",
                  color: "#475467",
                  fontSize: "11px",
                  fontWeight: "800",
                }}
              >
                Payment Success Rate (%)
              </label>

              <input
                type="number"
                name="success_rate"
                value={form.success_rate}
                onChange={handleChange}
                placeholder="90"
                min="0"
                max="100"
                required
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "11px 12px",
                  border: "1px solid #dfe4eb",
                  borderRadius: "9px",
                  outline: "none",
                  fontSize: "12px",
                }}
              />
            </div>


            {/* SAVE */}

            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
              }}
            >

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "11px",
                  border: "none",
                  borderRadius: "9px",
                  background: loading
                    ? "#98a2b3"
                    : "#172d62",
                  color: "#fff",
                  fontSize: "12px",
                  fontWeight: "800",
                  cursor: loading
                    ? "not-allowed"
                    : "pointer",
                }}
              >
                {loading
                  ? "Adding..."
                  : "Save Customer"}
              </button>

            </div>

          </form>
        </div>
      )}


      {/* ================= KPI ================= */}

      <div className="customers-section">

        <div className="customers-kpi-grid">

          <div className="customer-kpi">

            <div className="customer-kpi-icon blue">
              👥
            </div>

            <div>
              <span>Total Customers</span>

              <strong>{totalCustomers}</strong>

              <p>Active customer base</p>
            </div>

          </div>


          <div className="customer-kpi">

            <div className="customer-kpi-icon purple">
              💎
            </div>

            <div>
              <span>High Value</span>

              <strong>
                {highValueCustomers}
              </strong>

              <p>₹50K+ lifetime value</p>
            </div>

          </div>


          <div className="customer-kpi">

            <div className="customer-kpi-icon orange">
              ⚠️
            </div>

            <div>
              <span>At Risk</span>

              <strong>
                {atRiskCustomers}
              </strong>

              <p>Customers with failed payments</p>
            </div>

          </div>


          <div className="customer-kpi">

            <div className="customer-kpi-icon green">
              ₹
            </div>

            <div>
              <span>Recovered Revenue</span>

              <strong>
                ₹
                {totalRecoveredRevenue.toLocaleString()}
              </strong>

              <p>Revenue recovered</p>
            </div>

          </div>

        </div>
      </div>


      {/* ================= OPPORTUNITIES ================= */}

      {opportunities.length > 0 && (
        <div className="customer-opportunity">

          <div className="opportunity-main">

            <div className="opportunity-icon">
              🎯
            </div>

            <div>

              <div className="opportunity-label">
                RECOVERY OPPORTUNITY
              </div>

              <h2>
                High-value customers need attention
              </h2>

              <p>
                RevenueAI detected customers with failed
                payments and meaningful lifetime value.
              </p>

            </div>

          </div>

          <div className="opportunity-count">

            <strong>
              {opportunities.length}
            </strong>

            <span>opportunities</span>

          </div>

        </div>
      )}


      {/* ================= TABLE ================= */}

      <div className="customers-table-card">

        <div className="customers-table-header">

          <div>

            <h2>Customer Portfolio</h2>

            <p>
              Customer value, payment health and recovery performance
            </p>

          </div>

          <span className="customer-count-badge">
            {customers.length} customers
          </span>

        </div>


        <div className="customers-table-wrap">

          <table className="customers-table">

            <thead>

              <tr>
                <th>Customer</th>
                <th>Segment</th>
                <th>Lifetime Value</th>
                <th>Success Rate</th>
                <th>Risk</th>
                <th>Failed</th>
                <th>Recovered</th>
                <th>Recovered Revenue</th>
              </tr>

            </thead>


            <tbody>

              {customers.map((customer) => {

                const failed =
                  Number(customer.failed_payments || 0);

                const successRate =
                  Number(customer.success_rate || 0);

                let risk = "LOW";
                let riskClass = "risk-low";

                if (
                  failed > 0 &&
                  successRate < 75
                ) {
                  risk = "HIGH";
                  riskClass = "risk-high";
                } else if (failed > 0) {
                  risk = "MEDIUM";
                  riskClass = "risk-medium";
                }

                const initial =
                  customer.name
                    ?.charAt(0)
                    ?.toUpperCase() || "?";

                return (
                  <tr key={customer.id}>

                    <td>

                      <div className="customer-profile">

                        <div className="customer-avatar">
                          {initial}
                        </div>

                        <div>

                          <strong>
                            {customer.name}
                          </strong>

                          <span>
                            {customer.email}
                          </span>

                        </div>

                      </div>

                    </td>


                    <td>

                      <span className="customer-segment">
                        {customer.segment}
                      </span>

                    </td>


                    <td>

                      <span className="customer-value">
                        ₹
                        {Number(
                          customer.lifetime_value || 0
                        ).toLocaleString()}
                      </span>

                    </td>


                    <td>

                      <div className="success-rate">

                        <div className="success-rate-top">

                          <span>
                            {successRate}%
                          </span>

                        </div>

                        <div className="success-rate-bar">

                          <div
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(
                                  0,
                                  successRate
                                )
                              )}%`,
                            }}
                          ></div>

                        </div>

                      </div>

                    </td>


                    <td>

                      <span
                        className={`customer-risk ${riskClass}`}
                      >
                        <span></span>
                        {risk}
                      </span>

                    </td>


                    <td>

                      <span className="failed-count">
                        {failed}
                      </span>

                    </td>


                    <td>

                      <span className="recovered-count">
                        {customer.recovered_payments || 0}
                      </span>

                    </td>


                    <td>
                      ₹
                      {Number(
                        customer.recovered_revenue || 0
                      ).toLocaleString()}
                    </td>

                  </tr>
                );
              })}

            </tbody>

          </table>

        </div>
      </div>


      {/* ================= TOP OPPORTUNITIES ================= */}

      {opportunities.length > 0 && (
        <div className="customers-table-card">

          <div className="customers-table-header">

            <div>

              <h2>Priority Opportunities</h2>

              <p>
                Customers ranked by lifetime value with failed payments
              </p>

            </div>

          </div>

          <div
            style={{
              padding: "5px 22px 15px",
            }}
          >

            <div className="opportunity-list">

              {opportunities.map(
                (customer, index) => (
                  <div
                    className="opportunity-customer"
                    key={customer.id}
                  >

                    <div className="opportunity-rank">
                      #{index + 1}
                    </div>

                    <div className="opportunity-customer-info">

                      <strong>
                        {customer.name}
                      </strong>

                      <span>
                        {customer.email}
                      </span>

                    </div>

                    <div className="opportunity-detail">

                      <span>LIFETIME VALUE</span>

                      <strong>
                        ₹
                        {Number(
                          customer.lifetime_value || 0
                        ).toLocaleString()}
                      </strong>

                    </div>

                    <div className="opportunity-detail">

                      <span>FAILED PAYMENTS</span>

                      <strong>
                        {customer.failed_payments || 0}
                      </strong>

                    </div>

                    <div className="opportunity-detail">

                      <span>SUCCESS RATE</span>

                      <strong>
                        {customer.success_rate || 0}%
                      </strong>

                    </div>

                  </div>
                )
              )}

            </div>

          </div>

        </div>
      )}


      {/* ================= EXPLANATION ================= */}

      <div className="customers-explanation">

        <div className="customers-explanation-icon">
          ✦
        </div>

        <div>

          <h2>
            How RevenueAI uses customer data
          </h2>

          <p>
            RevenueAI combines{" "}
            <strong>
              lifetime value, payment success rate
            </strong>{" "}
            and{" "}
            <strong>
              failed payment history
            </strong>{" "}
            to identify valuable recovery opportunities
            and recommend the safest next action.
          </p>

        </div>

      </div>

    </div>
  );
}