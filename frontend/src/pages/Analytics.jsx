import { useEffect, useState } from "react";

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;

const titleCase = (value = "") =>
  String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("revenue_token");

      if (!token) {
        throw new Error("Session expired. Please login again.");
      }

      const response = await fetch(
        "http://localhost:5000/api/analytics",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Failed to load analytics"
        );
      }

      setData(result);
    } catch (err) {
      console.error("Analytics error:", err);
      setError(err.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }

  /* =========================
     LOADING
  ========================= */

  if (loading) {
    return (
      <>
        <style>{styles}</style>

        <div className="ra-loading">
          <div className="ra-spinner"></div>
          <span>Loading analytics...</span>
        </div>
      </>
    );
  }

  /* =========================
     ERROR
  ========================= */

  if (error || !data) {
    return (
      <>
        <style>{styles}</style>

        <div className="ra-empty-page">
          <div className="ra-empty-icon">!</div>

          <h2>
            {error ? "Analytics unavailable" : "No analytics data"}
          </h2>

          <p>
            {error ||
              "Analytics data could not be loaded."}
          </p>

          <button
            className="ra-refresh"
            onClick={loadAnalytics}
          >
            ↻ Retry
          </button>
        </div>
      </>
    );
  }

  /* =========================
     DATA
  ========================= */

  const summary = data.summary || {};

  const failureReasons =
    Array.isArray(data.failureReasons)
      ? data.failureReasons
      : [];

  const strategies =
    Array.isArray(data.strategies)
      ? data.strategies
      : [];

  const score =
    data.scoreDistribution || {};

  const paymentMethods =
    Array.isArray(data.paymentMethods)
      ? data.paymentMethods
      : [];

  const topCustomers =
    Array.isArray(data.topCustomers)
      ? data.topCustomers
      : [];

  const trend =
    Array.isArray(data.trend)
      ? data.trend
      : [];

  /* =========================
     SCORE CALCULATIONS
  ========================= */

  const high = Number(score.high || 0);
  const medium = Number(score.medium || 0);
  const low = Number(score.low || 0);

  const totalScore =
    high + medium + low;

  const highPercent =
    totalScore > 0
      ? Math.round((high / totalScore) * 100)
      : 0;

  const mediumPercent =
    totalScore > 0
      ? Math.round((medium / totalScore) * 100)
      : 0;

  const lowPercent =
    totalScore > 0
      ? Math.max(
          0,
          100 - highPercent - mediumPercent
        )
      : 0;

  /* =========================
     FAILURE MAX
  ========================= */

  const maxFailureCount = Math.max(
    ...failureReasons.map((x) =>
      Number(x.count || 0)
    ),
    1
  );

  /* =========================
     TREND MAX
  ========================= */

  const maxTrendValue = Math.max(
    ...trend.map((x) =>
      Number(
        x.recoveredRevenue ||
          x.recovered_revenue ||
          0
      )
    ),
    1
  );

  /* =========================
     RECOVERY EFFICIENCY
     NO useMemo
  ========================= */

  const risk =
    Number(summary.revenueAtRisk || 0);

  const recovered =
    Number(summary.recoveredRevenue || 0);

  const recoveryEfficiency =
    !risk && !recovered
      ? 0
      : Math.min(
          100,
          Math.round(
            (recovered /
              Math.max(
                risk + recovered,
                1
              )) *
              100
          )
        );

  return (
    <>
      <style>{styles}</style>

      <div className="ra-analytics-page">

        {/* =========================
            HEADER
        ========================= */}

        <div className="ra-header">

          <div>
            <div className="ra-overline">
              REVENUE INTELLIGENCE
            </div>

            <h1>Analytics</h1>

            <p>
              Understand payment failures,
              recovery performance and where
              revenue is slipping away.
            </p>
          </div>

          <button
            className="ra-refresh"
            onClick={loadAnalytics}
          >
            <span>↻</span>
            Refresh
          </button>

        </div>

        {/* =========================
            KPI CARDS
        ========================= */}

        <div className="ra-kpi-grid">

          <div className="ra-kpi-card risk-card">

            <div className="ra-kpi-top">
              <div className="ra-kpi-icon">
                ₹
              </div>

              <span className="ra-kpi-label">
                REVENUE AT RISK
              </span>
            </div>

            <div className="ra-kpi-value">
              {money(summary.revenueAtRisk)}
            </div>

            <div className="ra-kpi-bottom">
              <span className="ra-dot red"></span>
              Failed payment value
            </div>

          </div>

          <div className="ra-kpi-card recovered-card">

            <div className="ra-kpi-top">
              <div className="ra-kpi-icon">
                ✓
              </div>

              <span className="ra-kpi-label">
                RECOVERED REVENUE
              </span>
            </div>

            <div className="ra-kpi-value">
              {money(summary.recoveredRevenue)}
            </div>

            <div className="ra-kpi-bottom">
              <span className="ra-dot green"></span>
              Successfully recovered
            </div>

          </div>

          <div className="ra-kpi-card rate-card">

            <div className="ra-kpi-top">
              <div className="ra-kpi-icon">
                %
              </div>

              <span className="ra-kpi-label">
                RECOVERY RATE
              </span>
            </div>

            <div className="ra-kpi-value">
              {Number(summary.recoveryRate || 0)}%
            </div>

            <div className="ra-kpi-bottom">
              <span className="ra-dot blue"></span>
              Overall transaction recovery
            </div>

          </div>

          <div className="ra-kpi-card failed-card">

            <div className="ra-kpi-top">
              <div className="ra-kpi-icon">
                !
              </div>

              <span className="ra-kpi-label">
                FAILED PAYMENTS
              </span>
            </div>

            <div className="ra-kpi-value">
              {Number(summary.failedPayments || 0)}
            </div>

            <div className="ra-kpi-bottom">
              <span className="ra-dot orange"></span>
              Payments requiring action
            </div>

          </div>

        </div>

        {/* =========================
            RECOVERY TREND
        ========================= */}

        <div className="ra-main-card ra-trend-card">

          <div className="ra-card-heading">

            <div>
              <div className="ra-section-label">
                PERFORMANCE
              </div>

              <h2>Recovery Trend</h2>

              <p>
                Recovered revenue over time
              </p>
            </div>

            <div className="ra-trend-badge">
              <span></span>
              Recovered
            </div>

          </div>

          {trend.length === 0 ? (

            <div className="ra-no-data">
              No trend data available.
            </div>

          ) : (

            <div className="ra-chart">

              <div className="ra-y-labels">

                <span>
                  {money(maxTrendValue)}
                </span>

                <span>
                  {money(maxTrendValue / 2)}
                </span>

                <span>
                  ₹0
                </span>

              </div>

              <div className="ra-bars-area">

                <div className="ra-grid-line line-1"></div>
                <div className="ra-grid-line line-2"></div>
                <div className="ra-grid-line line-3"></div>

                <div className="ra-bars">

                  {trend.map((item, index) => {

                    const value =
                      Number(
                        item.recoveredRevenue ??
                        item.recovered_revenue ??
                        0
                      );

                    const height =
                      Math.max(
                        5,
                        (value / maxTrendValue) * 100
                      );

                    const date =
                      new Date(item.date);

                    const label =
                      isNaN(date.getTime())
                        ? item.date
                        : date.toLocaleDateString(
                            "en-IN",
                            {
                              day: "2-digit",
                              month: "short",
                            }
                          );

                    return (
                      <div
                        className="ra-bar-column"
                        key={index}
                      >

                        <div className="ra-bar-value">
                          {value > 0
                            ? money(value)
                            : ""}
                        </div>

                        <div
                          className="ra-bar"
                          style={{
                            height: `${height}%`,
                          }}
                        />

                        <span>
                          {label}
                        </span>

                      </div>
                    );
                  })}

                </div>

              </div>

            </div>

          )}

        </div>

        {/* =========================
            TWO COLUMN
        ========================= */}

        <div className="ra-two-column">

          {/* FAILURE REASONS */}

          <div className="ra-main-card">

            <div className="ra-card-heading">

              <div>
                <div className="ra-section-label">
                  PAYMENT HEALTH
                </div>

                <h2>
                  Failure Reasons
                </h2>

                <p>
                  Where failed payments are
                  coming from.
                </p>
              </div>

              <div className="ra-count-pill">
                {failureReasons.length} types
              </div>

            </div>

            {failureReasons.length === 0 ? (

              <div className="ra-no-data">

                <div className="ra-no-data-icon">
                  ✓
                </div>

                <strong>
                  No failed payments
                </strong>

                <span>
                  Great! There are currently
                  no failed payments.
                </span>

              </div>

            ) : (

              <div className="ra-failure-list">

                {failureReasons.map(
                  (item, index) => {

                    const count =
                      Number(item.count || 0);

                    const width =
                      (count /
                        maxFailureCount) *
                      100;

                    return (
                      <div
                        className="ra-failure-item"
                        key={index}
                      >

                        <div className="ra-failure-top">

                          <div className="ra-failure-name">

                            <div className="ra-failure-number">
                              {String(index + 1).padStart(
                                2,
                                "0"
                              )}
                            </div>

                            <strong>
                              {titleCase(
                                item.reason
                              )}
                            </strong>

                          </div>

                          <div className="ra-failure-count">

                            <strong>
                              {count}
                            </strong>

                            <span>
                              {money(item.amount)}
                            </span>

                          </div>

                        </div>

                        <div className="ra-progress-track">

                          <div
                            className="ra-progress-fill"
                            style={{
                              width: `${width}%`,
                            }}
                          />

                        </div>

                      </div>
                    );
                  }
                )}

              </div>
            )}

          </div>

          {/* RECOVERY SCORE */}

          <div className="ra-main-card">

            <div className="ra-card-heading">

              <div>
                <div className="ra-section-label">
                  AI INTELLIGENCE
                </div>

                <h2>
                  Recovery Score
                </h2>

                <p>
                  AI confidence distribution
                </p>
              </div>

              <div className="ra-ai-badge">
                AI
              </div>

            </div>

            <div className="ra-score-content">

              <div
                className="ra-donut"
                style={{
                  background: `conic-gradient(
                    #16a34a 0 ${highPercent}%,
                    #f59e0b ${highPercent}% ${
                      highPercent + mediumPercent
                    }%,
                    #ef4444 ${
                      highPercent + mediumPercent
                    }% 100%
                  )`,
                }}
              >

                <div className="ra-donut-inner">

                  <strong>
                    {totalScore}
                  </strong>

                  <span>
                    Actions
                  </span>

                </div>

              </div>

              <div className="ra-score-list">

                <div className="ra-score-item">

                  <div>
                    <span className="score-dot high"></span>
                    <span>High</span>
                  </div>

                  <strong>{high}</strong>

                </div>

                <div className="ra-score-item">

                  <div>
                    <span className="score-dot medium"></span>
                    <span>Medium</span>
                  </div>

                  <strong>{medium}</strong>

                </div>

                <div className="ra-score-item">

                  <div>
                    <span className="score-dot low"></span>
                    <span>Low</span>
                  </div>

                  <strong>{low}</strong>

                </div>

              </div>

            </div>

            <div className="ra-guardrail">

              <div className="ra-guardrail-icon">
                60%
              </div>

              <div>

                <strong>
                  Guardrail Threshold
                </strong>

                <span>
                  Below 60% requires merchant
                  approval before recovery.
                </span>

              </div>

              <span className="ra-policy-status">
                Active
              </span>

            </div>

          </div>

        </div>

        {/* =========================
            RECOVERY STRATEGIES
        ========================= */}

        <div className="ra-main-card">

          <div className="ra-card-heading">

            <div>
              <div className="ra-section-label">
                RECOVERY ENGINE
              </div>

              <h2>
                Recovery Strategies
              </h2>

              <p>
                Actions recommended by the
                recovery engine.
              </p>
            </div>

          </div>

          {strategies.length === 0 ? (

            <div className="ra-no-data">
              No recovery strategies available.
            </div>

          ) : (

            <div className="ra-strategy-grid">

              {strategies.map(
                (strategy, index) => {

                  const total =
                    Number(strategy.total || 0);

                  const executed =
                    Number(strategy.executed || 0);

                  const approved =
                    Number(strategy.approved || 0);

                  const pending =
                    Number(strategy.pending || 0);

                  const success =
                    total > 0
                      ? Math.round(
                          (executed / total) * 100
                        )
                      : 0;

                  return (
                    <div
                      className="ra-strategy-card"
                      key={index}
                    >

                      <div className="ra-strategy-icon">
                        {index === 0
                          ? "↻"
                          : index === 1
                          ? "⚡"
                          : index === 2
                          ? "✦"
                          : "→"}
                      </div>

                      <div className="ra-strategy-name">
                        {titleCase(strategy.action)}
                      </div>

                      <div className="ra-strategy-total">
                        {total}
                      </div>

                      <span className="ra-strategy-label">
                        Total recommendations
                      </span>

                      <div className="ra-strategy-stats">

                        <div>
                          <span>Executed</span>
                          <strong>{executed}</strong>
                        </div>

                        <div>
                          <span>Approved</span>
                          <strong>{approved}</strong>
                        </div>

                        <div>
                          <span>Pending</span>
                          <strong>{pending}</strong>
                        </div>

                      </div>

                      <div className="ra-strategy-progress">

                        <div
                          style={{
                            width: `${success}%`,
                          }}
                        />

                      </div>

                      <span className="ra-success-label">
                        {success}% execution rate
                      </span>

                    </div>
                  );
                }
              )}

            </div>

          )}

        </div>

        {/* =========================
            PAYMENT METHODS
        ========================= */}

        <div className="ra-main-card">

          <div className="ra-card-heading">

            <div>
              <div className="ra-section-label">
                PAYMENT CHANNELS
              </div>

              <h2>
                Payment Method Performance
              </h2>

              <p>
                Compare payment channels and
                their recovery outcomes.
              </p>
            </div>

          </div>

          {paymentMethods.length === 0 ? (

            <div className="ra-no-data">
              No payment method data available.
            </div>

          ) : (

            <div className="ra-payment-grid">

              {paymentMethods.map(
                (item, index) => {

                  const total =
                    Number(item.total || 0);

                  const recovered =
                    Number(item.recovered || 0);

                  const failed =
                    Number(item.failed || 0);

                  const rate =
                    total > 0
                      ? Math.round(
                          (recovered / total) * 100
                        )
                      : 0;

                  return (
                    <div
                      className="ra-payment-card"
                      key={index}
                    >

                      <div className="ra-payment-top">

                        <div className="ra-payment-icon">
                          {item.method === "UPI"
                            ? "U"
                            : item.method === "CARD"
                            ? "C"
                            : "P"}
                        </div>

                        <div>

                          <strong>
                            {item.method || "UNKNOWN"}
                          </strong>

                          <span>
                            Payment channel
                          </span>

                        </div>

                      </div>

                      <div className="ra-payment-value">
                        {money(item.amount)}
                      </div>

                      <div className="ra-payment-stats">

                        <div>
                          <span>Total</span>
                          <strong>{total}</strong>
                        </div>

                        <div>
                          <span>Failed</span>
                          <strong>{failed}</strong>
                        </div>

                        <div>
                          <span>Recovered</span>
                          <strong className="green-text">
                            {recovered}
                          </strong>
                        </div>

                      </div>

                      <div className="ra-payment-rate">

                        <div className="ra-rate-top">

                          <span>
                            Recovery rate
                          </span>

                          <strong>
                            {rate}%
                          </strong>

                        </div>

                        <div className="ra-rate-track">

                          <div
                            style={{
                              width: `${rate}%`,
                            }}
                          />

                        </div>

                      </div>

                    </div>
                  );
                }
              )}

            </div>

          )}

        </div>

        {/* =========================
            TOP CUSTOMERS
        ========================= */}

        <div className="ra-main-card">

          <div className="ra-card-heading">

            <div>

              <div className="ra-section-label">
                CUSTOMER INTELLIGENCE
              </div>

              <h2>
                Highest Revenue at Risk
              </h2>

              <p>
                Customers with the highest
                outstanding failed payment value.
              </p>

            </div>

            <div className="ra-count-pill">
              Top 10
            </div>

          </div>

          {topCustomers.length === 0 ? (

            <div className="ra-no-data">
              No customer risk data available.
            </div>

          ) : (

            <div className="ra-table-wrapper">

              <table className="ra-table">

                <thead>

                  <tr>
                    <th>Customer</th>
                    <th>Segment</th>
                    <th>Success Rate</th>
                    <th>Failed Payments</th>
                    <th>Revenue at Risk</th>
                  </tr>

                </thead>

                <tbody>

                  {topCustomers.map(
                    (customer) => {

                      const successRate =
                        Number(
                          customer.successRate ??
                          customer.success_rate ??
                          0
                        );

                      return (
                        <tr key={customer.id}>

                          <td>

                            <div className="ra-customer">

                              <div className="ra-avatar">
                                {customer.name
                                  ?.charAt(0)
                                  ?.toUpperCase()}
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

                            <span className="ra-segment">
                              {customer.segment}
                            </span>

                          </td>

                          <td>

                            <div className="ra-success-rate">

                              <div className="ra-mini-track">

                                <div
                                  style={{
                                    width: `${Math.min(
                                      successRate,
                                      100
                                    )}%`,
                                  }}
                                />

                              </div>

                              <strong>
                                {successRate}%
                              </strong>

                            </div>

                          </td>

                          <td>

                            <span className="ra-failed-count">
                              {customer.failedPayments ?? 0}
                            </span>

                          </td>

                          <td>

                            <strong className="ra-risk-money">
                              {money(
                                customer.revenueAtRisk
                              )}
                            </strong>

                          </td>

                        </tr>
                      );
                    }
                  )}

                </tbody>

              </table>

            </div>

          )}

        </div>

        {/* =========================
            AI INSIGHT
        ========================= */}

        <div className="ra-insight-banner">

          <div className="ra-insight-symbol">
            ✦
          </div>

          <div className="ra-insight-content">

            <span>
              AI REVENUE INTELLIGENCE
            </span>

            <h3>
              {recoveryEfficiency > 50
                ? "Recovery engine is converting meaningful revenue."
                : "There is significant room to improve recovery."}
            </h3>

            <p>
              The recovery engine combines
              payment failures, customer
              behaviour, AI probability and
              policy guardrails to prioritize
              recoverable revenue.
            </p>

          </div>

          <div className="ra-insight-metric">

            <strong>
              {recoveryEfficiency}%
            </strong>

            <span>
              Recovery efficiency
            </span>

          </div>

        </div>

      </div>
    </>
  );
}


/* =====================================================
   ANALYTICS PAGE CSS
===================================================== */
const styles = `
* {
  box-sizing: border-box;
}

.ra-analytics-page {
  min-height: 100vh;
  padding: 32px 36px 60px;
  background:
    radial-gradient(circle at 10% 0%, rgba(99,102,241,.07), transparent 28%),
    radial-gradient(circle at 90% 10%, rgba(14,165,233,.06), transparent 25%),
    #f7f9fc;
  color: #172033;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

/* HEADER */

.ra-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 30px;
}

.ra-overline,
.ra-section-label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1.7px;
  color: #68758a;
}

.ra-header h1 {
  margin: 7px 0 8px;
  font-size: 36px;
  line-height: 1;
  letter-spacing: -1.3px;
  color: #111827;
}

.ra-header p {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: #748096;
}

/* BUTTON */

.ra-refresh {
  border: 1px solid #dfe5ee;
  background: rgba(255,255,255,.9);
  color: #263248;
  border-radius: 11px;
  padding: 11px 17px;
  font-size: 12px;
  font-weight: 750;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 5px 18px rgba(30,41,59,.05);
  transition: all .2s ease;
}

.ra-refresh:hover {
  transform: translateY(-2px);
  border-color: #cbd5e1;
  box-shadow: 0 9px 25px rgba(30,41,59,.09);
}

.ra-refresh span {
  font-size: 17px;
}

/* KPI */

.ra-kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0,1fr));
  gap: 17px;
  margin-bottom: 19px;
}

.ra-kpi-card {
  position: relative;
  background: rgba(255,255,255,.96);
  border: 1px solid #e4e9f0;
  border-radius: 17px;
  padding: 21px;
  min-height: 153px;
  overflow: hidden;
  transition: all .22s ease;
  box-shadow: 0 5px 20px rgba(30,41,59,.035);
}

.ra-kpi-card::after {
  content: "";
  position: absolute;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  right: -35px;
  bottom: -35px;
  background: #f4f6f9;
}

.ra-kpi-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 14px 32px rgba(30,41,59,.09);
}

.ra-kpi-top {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ra-kpi-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f1f4f8;
  color: #202b40;
  font-size: 14px;
  font-weight: 900;
}

.risk-card .ra-kpi-icon {
  background: #fff1f1;
  color: #dc2626;
}

.recovered-card .ra-kpi-icon {
  background: #ecfdf3;
  color: #16a34a;
}

.rate-card .ra-kpi-icon {
  background: #eff6ff;
  color: #2563eb;
}

.failed-card .ra-kpi-icon {
  background: #fff7ed;
  color: #ea580c;
}

.ra-kpi-label {
  font-size: 9px;
  font-weight: 850;
  letter-spacing: 1.1px;
  color: #7a8598;
}

.ra-kpi-value {
  position: relative;
  z-index: 2;
  margin-top: 18px;
  font-size: clamp(22px,2vw,29px);
  font-weight: 850;
  letter-spacing: -1px;
  color: #101827;
  white-space: nowrap;
}

.ra-kpi-bottom {
  position: relative;
  z-index: 2;
  margin-top: 9px;
  font-size: 10px;
  color: #8490a2;
  display: flex;
  align-items: center;
  gap: 6px;
}

.ra-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  display: inline-block;
}

.ra-dot.red { background:#ef4444; }
.ra-dot.green { background:#16a34a; }
.ra-dot.blue { background:#3b82f6; }
.ra-dot.orange { background:#f59e0b; }

/* CARDS */

.ra-main-card {
  background: rgba(255,255,255,.97);
  border: 1px solid #e2e7ef;
  border-radius: 17px;
  padding: 24px;
  margin-bottom: 19px;
  box-shadow: 0 5px 20px rgba(30,41,59,.035);
  transition: box-shadow .2s ease;
}

.ra-main-card:hover {
  box-shadow: 0 9px 27px rgba(30,41,59,.055);
}

.ra-card-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 25px;
}

.ra-card-heading h2 {
  margin: 6px 0 5px;
  font-size: 18px;
  letter-spacing: -.35px;
  color: #172033;
}

.ra-card-heading p {
  margin: 0;
  font-size: 11px;
  color: #8490a2;
}

.ra-count-pill,
.ra-ai-badge {
  border: 1px solid #e1e6ee;
  border-radius: 20px;
  padding: 6px 10px;
  color: #68758a;
  background: #fafbfc;
  font-size: 9px;
  font-weight: 800;
}

.ra-ai-badge {
  border: none;
  background: #eef2ff;
  color: #4f46e5;
  border-radius: 8px;
}

/* TREND */

.ra-trend-card {
  min-height: 365px;
}

.ra-trend-badge {
  font-size: 10px;
  color: #68758a;
  display: flex;
  align-items: center;
  gap: 7px;
}

.ra-trend-badge span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #4f46e5;
  box-shadow: 0 0 0 4px #eef2ff;
}

.ra-chart {
  height: 245px;
  display: flex;
  margin-top: 12px;
}

.ra-y-labels {
  width: 80px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 5px 13px 26px 0;
  font-size: 9px;
  color: #98a1b1;
  text-align: right;
}

.ra-bars-area {
  flex: 1;
  position: relative;
  border-bottom: 1px solid #dfe4eb;
}

.ra-grid-line {
  position: absolute;
  left: 0;
  right: 0;
  border-top: 1px dashed #edf0f4;
}

.ra-grid-line.line-1 { top:0; }
.ra-grid-line.line-2 { top:50%; }
.ra-grid-line.line-3 { bottom:0; }

.ra-bars {
  height: 100%;
  display: flex;
  align-items: flex-end;
  gap: 15px;
  padding: 8px 10px 0;
  position: relative;
  z-index: 2;
}

.ra-bar-column {
  height: 100%;
  flex: 1;
  max-width: 85px;
  min-width: 25px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  position: relative;
}

.ra-bar {
  width: 52%;
  min-width: 12px;
  max-width: 32px;
  background: linear-gradient(180deg,#4f46e5,#172033);
  border-radius: 7px 7px 2px 2px;
  transition: all .25s ease;
  box-shadow: 0 4px 10px rgba(79,70,229,.14);
}

.ra-bar:hover {
  transform: scaleX(1.12);
  filter: brightness(1.12);
}

.ra-bar-value {
  font-size: 9px;
  color: #68758a;
  margin-bottom: 6px;
}

.ra-bar-column > span {
  position: absolute;
  bottom: -22px;
  font-size: 8px;
  color: #8a94a5;
  white-space: nowrap;
}

/* TWO COLUMN */

.ra-two-column {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 19px;
}

/* FAILURE */

.ra-failure-list {
  display: flex;
  flex-direction: column;
  gap: 21px;
}

.ra-failure-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.ra-failure-name {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ra-failure-number {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: #f4f6f9;
  color: #7b8698;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: 850;
}

.ra-failure-name strong {
  font-size: 12px;
  color: #273248;
}

.ra-failure-count {
  display: flex;
  align-items: center;
  gap: 9px;
}

.ra-failure-count strong {
  font-size: 12px;
  color: #263147;
}

.ra-failure-count span {
  font-size: 10px;
  color: #9099a8;
}

.ra-progress-track {
  height: 7px;
  background: #edf0f4;
  border-radius: 20px;
  overflow: hidden;
}

.ra-progress-fill {
  height: 100%;
  background: linear-gradient(90deg,#172033,#4f46e5);
  border-radius: 20px;
}

/* SCORE */

.ra-score-content {
  display: flex;
  align-items: center;
  gap: 38px;
  min-height: 180px;
}

.ra-donut {
  width: 150px;
  height: 150px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 7px 22px rgba(30,41,59,.08);
}

.ra-donut-inner {
  width: 104px;
  height: 104px;
  background: white;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.ra-donut-inner strong {
  font-size: 27px;
  color: #182235;
}

.ra-donut-inner span {
  font-size: 9px;
  color: #8993a4;
  margin-top: 2px;
}

.ra-score-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ra-score-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ra-score-item > div {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 12px;
  color: #59657a;
}

.score-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
}

.score-dot.high { background:#16a34a; }
.score-dot.medium { background:#f59e0b; }
.score-dot.low { background:#ef4444; }

.ra-score-item strong {
  font-size: 13px;
  color: #202b40;
}

/* GUARDRAIL */

.ra-guardrail {
  margin-top: 15px;
  padding: 13px;
  border: 1px solid #e4e8ef;
  border-radius: 11px;
  background: #fafbfc;
  display: flex;
  align-items: center;
  gap: 11px;
}

.ra-guardrail-icon {
  width: 40px;
  height: 40px;
  border-radius: 9px;
  background: #eef2ff;
  color: #4f46e5;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 10px;
  font-weight: 900;
}

.ra-guardrail div:nth-child(2) {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.ra-guardrail strong {
  font-size: 11px;
  color: #273248;
}

.ra-guardrail span {
  font-size: 9px;
  color: #8993a4;
  margin-top: 3px;
}

.ra-policy-status {
  font-size: 9px !important;
  color: #16803c !important;
  font-weight: 800;
  background: #edf8f1;
  padding: 5px 9px;
  border-radius: 20px;
}

/* STRATEGIES */

.ra-strategy-grid {
  display: grid;
  grid-template-columns: repeat(4,minmax(0,1fr));
  gap: 14px;
}

.ra-strategy-card {
  position: relative;
  border: 1px solid #e2e7ee;
  border-radius: 13px;
  padding: 18px;
  background: linear-gradient(145deg,#fff,#fafbfc);
  transition: all .22s ease;
}

.ra-strategy-card:hover {
  border-color: #cdd5e1;
  transform: translateY(-3px);
  box-shadow: 0 10px 24px rgba(30,41,59,.07);
}

.ra-strategy-icon {
  width: 35px;
  height: 35px;
  border-radius: 10px;
  background: #eef2ff;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #4f46e5;
  font-weight: 850;
  margin-bottom: 13px;
}

.ra-strategy-name {
  font-size: 11px;
  font-weight: 750;
  color: #69758a;
  min-height: 30px;
}

.ra-strategy-total {
  margin-top: 8px;
  font-size: 26px;
  font-weight: 850;
  color: #172033;
}

.ra-strategy-label {
  display: block;
  font-size: 9px;
  color: #929baa;
  margin-top: 2px;
}

.ra-strategy-stats {
  display: grid;
  grid-template-columns: repeat(3,1fr);
  gap: 6px;
  margin-top: 18px;
}

.ra-strategy-stats div {
  background: #f5f7fa;
  border-radius: 7px;
  padding: 8px;
}

.ra-strategy-stats span {
  display: block;
  font-size: 8px;
  color: #8b94a3;
}

.ra-strategy-stats strong {
  display: block;
  margin-top: 3px;
  font-size: 11px;
  color: #273248;
}

.ra-strategy-progress {
  height: 5px;
  background: #edf0f3;
  border-radius: 10px;
  overflow: hidden;
  margin-top: 16px;
}

.ra-strategy-progress div {
  height: 100%;
  background: linear-gradient(90deg,#4f46e5,#172033);
  border-radius: 10px;
}

.ra-success-label {
  display: block;
  margin-top: 7px;
  font-size: 8px;
  color: #8b94a3;
}

/* PAYMENT */

.ra-payment-grid {
  display: grid;
  grid-template-columns: repeat(3,minmax(0,1fr));
  gap: 14px;
}

.ra-payment-card {
  border: 1px solid #e2e7ee;
  border-radius: 13px;
  padding: 18px;
  background: linear-gradient(145deg,#fff,#fafbfc);
  transition: .2s;
}

.ra-payment-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 9px 23px rgba(30,41,59,.06);
}

.ra-payment-top {
  display: flex;
  align-items: center;
  gap: 11px;
}

.ra-payment-icon {
  width: 39px;
  height: 39px;
  border-radius: 10px;
  background: #eef2ff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 900;
  color: #4f46e5;
}

.ra-payment-top strong {
  display: block;
  font-size: 13px;
  color: #273248;
}

.ra-payment-top span {
  display: block;
  font-size: 9px;
  color: #8c95a4;
  margin-top: 2px;
}

.ra-payment-value {
  margin-top: 20px;
  font-size: 21px;
  font-weight: 850;
  color: #182235;
}

.ra-payment-stats {
  display: grid;
  grid-template-columns: repeat(3,1fr);
  gap: 7px;
  margin-top: 15px;
}

.ra-payment-stats div {
  background: #f6f8fa;
  padding: 8px;
  border-radius: 7px;
}

.ra-payment-stats span {
  display: block;
  font-size: 8px;
  color: #8d96a5;
}

.ra-payment-stats strong {
  display: block;
  margin-top: 3px;
  font-size: 11px;
  color: #263147;
}

.green-text {
  color: #16803c !important;
}

.ra-payment-rate {
  margin-top: 16px;
}

.ra-rate-top {
  display: flex;
  justify-content: space-between;
  margin-bottom: 7px;
}

.ra-rate-top span {
  font-size: 9px;
  color: #8791a2;
}

.ra-rate-top strong {
  font-size: 9px;
  color: #283248;
}

.ra-rate-track {
  height: 5px;
  background: #edf0f3;
  border-radius: 20px;
  overflow: hidden;
}

.ra-rate-track div {
  height: 100%;
  background: linear-gradient(90deg,#4f46e5,#172033);
  border-radius: 20px;
}

/* TABLE */

.ra-table-wrapper {
  overflow-x: auto;
}

.ra-table {
  width: 100%;
  border-collapse: collapse;
}

.ra-table th {
  text-align: left;
  padding: 12px 10px;
  border-bottom: 1px solid #e5e9ef;
  color: #8a94a4;
  font-size: 9px;
  font-weight: 850;
  letter-spacing: .6px;
  text-transform: uppercase;
}

.ra-table td {
  padding: 14px 10px;
  border-bottom: 1px solid #f0f2f5;
  font-size: 11px;
  color: #4f5b70;
}

.ra-table tbody tr {
  transition: .15s;
}

.ra-table tbody tr:hover {
  background: #fafbff;
}

.ra-table tbody tr:last-child td {
  border-bottom: none;
}

.ra-customer {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ra-avatar {
  width: 35px;
  height: 35px;
  border-radius: 10px;
  background: #eef2ff;
  color: #4f46e5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 850;
}

.ra-customer strong {
  display: block;
  color: #273248;
  font-size: 11px;
}

.ra-customer span {
  display: block;
  color: #929baa;
  font-size: 9px;
  margin-top: 3px;
}

.ra-segment {
  padding: 5px 9px;
  border-radius: 7px;
  background: #f1f3f7;
  color: #667287;
  font-size: 8px;
  font-weight: 800;
}

.ra-success-rate {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ra-mini-track {
  width: 65px;
  height: 5px;
  border-radius: 20px;
  background: #edf0f3;
  overflow: hidden;
}

.ra-mini-track div {
  height: 100%;
  background: #4f46e5;
}

.ra-success-rate strong {
  font-size: 10px;
  color: #3d495d;
}

.ra-failed-count {
  background: #fff2f2;
  color: #c43c3c;
  border-radius: 7px;
  padding: 5px 8px;
  font-weight: 750;
  font-size: 9px;
}

.ra-risk-money {
  color: #b83232;
  font-size: 11px;
}

/* AI INSIGHT */

.ra-insight-banner {
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(circle at 85% 30%,rgba(99,102,241,.3),transparent 28%),
    linear-gradient(135deg,#121a2b,#202b45);
  border-radius: 17px;
  padding: 23px 25px;
  color: white;
  display: flex;
  align-items: center;
  gap: 17px;
  margin-top: 2px;
  box-shadow: 0 12px 30px rgba(18,26,43,.15);
}

.ra-insight-symbol {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: 12px;
  background: rgba(255,255,255,.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.ra-insight-content {
  flex: 1;
}

.ra-insight-content > span {
  font-size: 8px;
  letter-spacing: 1.4px;
  font-weight: 850;
  opacity: .55;
}

.ra-insight-content h3 {
  margin: 6px 0 5px;
  font-size: 15px;
}

.ra-insight-content p {
  margin: 0;
  font-size: 10px;
  line-height: 1.55;
  opacity: .62;
  max-width: 650px;
}

.ra-insight-metric {
  min-width: 140px;
  text-align: right;
  border-left: 1px solid rgba(255,255,255,.13);
  padding-left: 25px;
}

.ra-insight-metric strong {
  display: block;
  font-size: 27px;
}

.ra-insight-metric span {
  font-size: 9px;
  opacity: .55;
}

/* EMPTY / LOADING */

.ra-no-data {
  min-height: 130px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 7px;
  color: #8a94a5;
  font-size: 11px;
}

.ra-no-data-icon {
  width: 37px;
  height: 37px;
  border-radius: 50%;
  background: #edf8f1;
  color: #16803c;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 850;
}

.ra-no-data strong {
  color: #455166;
  font-size: 12px;
}

.ra-no-data span {
  font-size: 10px;
}

.ra-loading,
.ra-empty-page {
  min-height: 70vh;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 12px;
  color: #6f7a8d;
  background: #f7f9fc;
}

.ra-spinner {
  width: 31px;
  height: 31px;
  border: 3px solid #e4e8ee;
  border-top-color: #4f46e5;
  border-radius: 50%;
  animation: ra-spin .8s linear infinite;
}

@keyframes ra-spin {
  to {
    transform: rotate(360deg);
  }
}

.ra-empty-icon {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: #fff1f1;
  color: #c33;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
}

/* RESPONSIVE */

@media (max-width:1100px) {
  .ra-kpi-grid {
    grid-template-columns: repeat(2,1fr);
  }

  .ra-strategy-grid {
    grid-template-columns: repeat(2,1fr);
  }
}

@media (max-width:800px) {
  .ra-analytics-page {
    padding: 22px 16px 40px;
  }

  .ra-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .ra-two-column {
    grid-template-columns: 1fr;
  }

  .ra-payment-grid {
    grid-template-columns: 1fr;
  }

  .ra-insight-banner {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .ra-insight-metric {
    width: 100%;
    text-align: left;
    border-left: none;
    border-top: 1px solid rgba(255,255,255,.12);
    padding: 14px 0 0;
  }
}

@media (max-width:560px) {
  .ra-kpi-grid {
    grid-template-columns: 1fr;
  }

  .ra-strategy-grid {
    grid-template-columns: 1fr;
  }

  .ra-score-content {
    flex-direction: column;
  }

  .ra-header h1 {
    font-size: 30px;
  }
}
`;