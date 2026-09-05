import { useEffect, useState } from "react";
import { api } from "../services/api";

const money = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;

const formatFailure = (reason) => {
  if (!reason) return "Unknown";

  return reason
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const getRisk = (payment) => {
  const amount = Number(payment.amount || 0);
  const attempts = Number(payment.attempt_count || 0);

  if (
    amount >= 20000 ||
    payment.failure_reason === "technical_failure"
  ) {
    return "HIGH";
  }

  if (
    amount >= 7000 ||
    attempts >= 2 ||
    payment.failure_reason === "bank_declined"
  ) {
    return "MEDIUM";
  }

  return "LOW";
};

export default function Payments({ onAnalyze }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/payments")
      .then((response) => {
        setRows(Array.isArray(response.data) ? response.data : []);
      })
      .catch((error) => {
        console.error("Payments API error:", error);
        setRows([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const failedRows = rows.filter(
    (payment) => payment.status === "failed"
  );

  const failedPayments = failedRows.length;

  const revenueAtRisk = failedRows.reduce(
    (total, payment) =>
      total + Number(payment.amount || 0),
    0
  );

  const highPriority = failedRows.filter(
    (payment) => getRisk(payment) === "HIGH"
  ).length;

  const recoverableAmount = failedRows.reduce(
    (total, payment) => {
      const risk = getRisk(payment);

      if (risk === "HIGH") {
        return total + Number(payment.amount || 0) * 0.85;
      }

      if (risk === "MEDIUM") {
        return total + Number(payment.amount || 0) * 0.65;
      }

      return total + Number(payment.amount || 0) * 0.45;
    },
    0
  );

  return (
    <div className="payments-page">

      {/* ================= HEADER ================= */}

      <div className="page-head payments-head">
        <div>
          <div className="payments-eyebrow">
            <span></span>
            REVENUE RECOVERY
          </div>

          <h1>Failed Payments</h1>

          <p>
            Identify failed transactions and prioritize the
            opportunities most likely to recover revenue.
          </p>
        </div>

        <div className="payments-header-badge">
          <span>●</span>
          Recovery Monitoring
        </div>
      </div>


      {/* ================= KPI CARDS ================= */}

      <div className="payments-kpi-grid">

        <div className="payments-kpi-card">
          <div className="payments-kpi-icon">
            !
          </div>

          <div>
            <p>Failed Payments</p>
            <h2>{failedPayments}</h2>
            <span>Transactions requiring attention</span>
          </div>
        </div>


        <div className="payments-kpi-card">
          <div className="payments-kpi-icon">
            ₹
          </div>

          <div>
            <p>Revenue at Risk</p>
            <h2>{money(revenueAtRisk)}</h2>
            <span>Total value currently at risk</span>
          </div>
        </div>


        <div className="payments-kpi-card">
          <div className="payments-kpi-icon">
            ↑
          </div>

          <div>
            <p>High Priority</p>
            <h2>{highPriority}</h2>
            <span>Best recovery opportunities</span>
          </div>
        </div>


        <div className="payments-kpi-card">
          <div className="payments-kpi-icon">
            ✓
          </div>

          <div>
            <p>Recoverable Value</p>
            <h2>{money(recoverableAmount)}</h2>
            <span>Estimated recovery opportunity</span>
          </div>
        </div>

      </div>


      {/* ================= TABLE ================= */}

      <div className="card payments-table-card">

        <div className="payments-table-header">

          <div>
            <h2>Recovery Opportunities</h2>

            <p>
              AI can analyze failed transactions and recommend
              the safest recovery action.
            </p>
          </div>

          <span className="payments-count">
            {failedPayments} active
          </span>

        </div>


        {loading ? (

          <div className="payments-empty">
            <div className="payments-empty-icon">↻</div>

            <h3>Loading payment data...</h3>

            <p>
              Fetching the latest payment recovery opportunities.
            </p>
          </div>

        ) : failedRows.length === 0 ? (

          <div className="payments-empty">
            <div className="payments-empty-icon">✓</div>

            <h3>No failed payments</h3>

            <p>
              Great! There are currently no failed transactions
              requiring recovery.
            </p>
          </div>

        ) : (

          <div className="table-wrap">

            <table>

              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Payment Method</th>
                  <th>Failure Reason</th>
                  <th>Attempts</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>


              <tbody>

                {rows.map((payment) => {

                  const risk = getRisk(payment);

                  return (
                    <tr key={payment.id}>

                      {/* CUSTOMER */}

                      <td>
                        <div className="payment-customer">
                          <div className="payment-avatar">
                            {String(
                              payment.customer_name || "?"
                            )
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div>
                            <strong>
                              {payment.customer_name}
                            </strong>

                            <span>
                              {payment.email}
                            </span>
                          </div>
                        </div>
                      </td>


                      {/* AMOUNT */}

                      <td>
                        <strong className="payment-amount">
                          {money(payment.amount)}
                        </strong>
                      </td>


                      {/* METHOD */}

                      <td>
                        <span className="payment-method">
                          {payment.payment_method}
                        </span>
                      </td>


                      {/* FAILURE */}

                      <td>
                        <span className="failure-reason">
                          {formatFailure(
                            payment.failure_reason
                          )}
                        </span>
                      </td>


                      {/* ATTEMPTS */}

                      <td>
                        <div className="attempts-cell">
                          <span>
                            {payment.attempt_count}
                          </span>

                          {Number(payment.attempt_count) >= 2 && (
                            <small>Retry</small>
                          )}
                        </div>
                      </td>


                      {/* PRIORITY */}

                      <td>
                        <span
                          className={`priority-badge priority-${risk.toLowerCase()}`}
                        >
                          <span>●</span>
                          {risk}
                        </span>
                      </td>


                      {/* STATUS */}

                      <td>
                        <span
                          className={
                            payment.status === "recovered"
                              ? "pill success"
                              : "pill danger"
                          }
                        >
                          {payment.status === "recovered"
                            ? "Recovered"
                            : "Failed"}
                        </span>
                      </td>


                      {/* ACTION */}

                      <td>
                        {payment.status === "failed" ? (

                          <button
                            className="ai-analysis-btn"
                            onClick={() =>
                              onAnalyze(payment.id)
                            }
                          >
                            <span>✦</span>
                            AI Analysis
                          </button>

                        ) : (

                          <span className="recovered-label">
                            ✓ Recovered
                          </span>

                        )}
                      </td>

                    </tr>
                  );
                })}

              </tbody>

            </table>

          </div>

        )}

      </div>


      {/* ================= EXPLANATION ================= */}

      <div className="payment-insight">

        <div className="payment-insight-icon">
          ✦
        </div>

        <div>
          <h3>How RevenueAI prioritizes recovery</h3>

          <p>
            Each failed payment is evaluated using transaction
            value, payment history, failure reason and retry
            attempts. AI analysis then recommends the most
            appropriate recovery action while policy guardrails
            prevent unnecessary or risky retries.
          </p>
        </div>

      </div>

    </div>
  );
}