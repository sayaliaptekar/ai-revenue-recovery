import { useEffect, useState } from "react";
import { api } from "../services/api";
import StatCard from "../components/StatCard";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const money = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [opportunities, setOpportunities] = useState([]);
  const [selectedDecision, setSelectedDecision] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const dashboardResponse = await api.get("/dashboard");
      setData(dashboardResponse.data);

      try {
        const recoveryResponse = await api.get("/recovery");
        setOpportunities(
          Array.isArray(recoveryResponse.data)
            ? recoveryResponse.data
            : []
        );
      } catch (error) {
        console.error("Recovery queue error:", error);
        setOpportunities([]);
      }
    } catch (error) {
      console.error("Dashboard error:", error);
    }
  }

  if (!data) {
    return <div className="loading">Loading dashboard...</div>;
  }

  const stats = data.stats || {};

  const failedPayments = Number(stats.failedPayments || 0);
  const revenueAtRisk = Number(stats.revenueAtRisk || 0);
  const predictedRecovery = Number(stats.predictedRecovery || 0);
  const recoveredRevenue = Number(stats.recoveredRevenue || 0);

  const opportunityRate =
    revenueAtRisk > 0
      ? Math.min(
          (predictedRecovery / revenueAtRisk) * 100,
          100
        )
      : 0;

  const topOpportunity = opportunities.length
    ? opportunities.reduce((best, current) =>
        Number(current.recovery_probability || 0) >
        Number(best.recovery_probability || 0)
          ? current
          : best
      )
    : null;

  function openRecovery() {
    window.location.href = "/recovery";
  }

  function openPayments() {
    window.location.href = "/payments";
  }

  function openAnalytics() {
    window.location.href = "/analytics";
  }

  function openAudit() {
    window.location.href = "/audit";
  }

  return (
    <div className="dashboard-page">

      {/* HEADER */}

      <div className="page-head dashboard-header">

        <div>
          <span className="dashboard-eyebrow">
            AI REVENUE RECOVERY PLATFORM
          </span>

          <h1>Dashboard</h1>

          <p>
            Monitor payment health, revenue risk and
            AI-powered recovery opportunities.
          </p>
        </div>

        <div className="merchant-profile">

          <div className="merchant-avatar">
            DM
          </div>

          <div>
            <strong>Demo Merchant</strong>
            <span>MER-2026-001</span>
          </div>

          <div className="profile-status">
            <span></span>
            Active
          </div>

        </div>

      </div>


      {/* KPI */}

      <div className="stats-grid dashboard-stats">

        <div
          className="dashboard-click-card"
          onClick={openPayments}
        >
          <StatCard
            label="Failed Payments"
            value={failedPayments}
            sub="Transactions needing attention"
          />
        </div>

        <div
          className="dashboard-click-card"
          onClick={openRecovery}
        >
          <StatCard
            label="Revenue At Risk"
            value={money(revenueAtRisk)}
            sub="Failed transaction value"
          />
        </div>

        <div
          className="dashboard-click-card"
          onClick={openRecovery}
        >
          <StatCard
            label="Predicted Recovery"
            value={money(predictedRecovery)}
            sub="AI estimated opportunity"
          />
        </div>

        <div
          className="dashboard-click-card"
          onClick={openAnalytics}
        >
          <StatCard
            label="Recovered Revenue"
            value={money(recoveredRevenue)}
            sub="Successfully recovered"
          />
        </div>

      </div>


      {/* RECOVERY OVERVIEW */}

      <div className="dashboard-section-title">

        <div>
          <h2>Recovery Overview</h2>

          <p>
            Current payment risk and AI recovery potential.
          </p>
        </div>

      </div>


      <div className="dashboard-overview-grid">


        {/* AI OPPORTUNITY */}

        <div className="card recovery-performance-card">

          <div className="card-heading">

            <div>
              <span className="card-eyebrow">
                RECOVERY PERFORMANCE
              </span>

              <h3>AI Recovery Opportunity</h3>
            </div>

            <div className="recovery-rate">
              {opportunityRate.toFixed(1)}%
            </div>

          </div>


          <p className="card-description">
            Estimated portion of currently failed revenue
            that the recovery model considers recoverable.
          </p>


          <div className="progress-track">

            <div
              className="progress-fill"
              style={{
                width: `${opportunityRate}%`,
              }}
            />

          </div>


          <div className="performance-details">

            <div>
              <span>Revenue At Risk</span>
              <strong>
                {money(revenueAtRisk)}
              </strong>
            </div>

            <div>
              <span>Predicted Recovery</span>
              <strong>
                {money(predictedRecovery)}
              </strong>
            </div>

            <div>
              <span>Failed Payments</span>
              <strong>
                {failedPayments}
              </strong>
            </div>

          </div>


          <button
            className="secondary-action"
            onClick={openRecovery}
          >
            View Recovery Opportunities →
          </button>

        </div>


        {/* MERCHANT */}

        <div className="card merchant-info-card">

          <div className="card-heading">

            <div>
              <span className="card-eyebrow">
                MERCHANT PROFILE
              </span>

              <h3>Account & Settlement</h3>
            </div>

            <div className="bank-icon">
              ₹
            </div>

          </div>


          <div className="merchant-info-grid">

            <div className="info-item">
              <span>Merchant ID</span>
              <strong>MER-2026-001</strong>
            </div>

            <div className="info-item">
              <span>Account Type</span>
              <strong>Business</strong>
            </div>

            <div className="info-item">
              <span>Settlement</span>
              <strong>T+2</strong>
            </div>

            <div className="info-item">
              <span>Currency</span>
              <strong>INR (₹)</strong>
            </div>

          </div>


          <div className="settlement-status">

            <div className="status-dot"></div>

            <div>
              <strong>
                Settlement Account Active
              </strong>

              <span>
                Payments are eligible for settlement
              </span>
            </div>

            <span className="masked-account">
              •••• 4582
            </span>

          </div>

        </div>

      </div>


      {/* AI NEXT BEST ACTION */}

      <div className="card next-best-card">

        <div className="next-best-content">

          <div className="next-best-icon">
            ✦
          </div>

          <div>

            <span className="card-eyebrow">
              AI NEXT BEST ACTION
            </span>

            {topOpportunity ? (
              <>
                <h3>
                  Review {topOpportunity.customer_name}'s
                  recovery opportunity
                </h3>

                <p>
                  {money(topOpportunity.amount)} payment with{" "}
                  <strong>
                    {topOpportunity.recovery_probability}%
                  </strong>{" "}
                  recovery probability.
                  Recommended action:{" "}
                  <strong>
                    {topOpportunity.recommended_action}
                  </strong>.
                </p>
              </>
            ) : (
              <>
                <h3>No active recovery opportunity</h3>

                <p>
                  All currently available recovery
                  opportunities have been processed.
                </p>
              </>
            )}

          </div>

        </div>

        {topOpportunity && (
          <button
            className="primary"
            onClick={openRecovery}
          >
            Review Opportunity →
          </button>
        )}

      </div>


      {/* ANALYTICS */}

      <div className="two-col dashboard-main-grid">


        {/* FAILURE REASONS */}

        <div className="card">

          <div className="section-card-header">

            <div>
              <span className="card-eyebrow">
                PAYMENT HEALTH
              </span>

              <h3>Failure Reasons</h3>

              <p>
                Current reasons behind failed payments.
              </p>
            </div>

          </div>


          {data.failureReasons?.length ? (

            <ResponsiveContainer
              width="100%"
              height={280}
            >

              <BarChart
                data={data.failureReasons}
                margin={{
                  top: 20,
                  right: 20,
                  left: 0,
                  bottom: 35,
                }}
              >

                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                />

                <XAxis
                  dataKey="failure_reason"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  angle={-12}
                  textAnchor="end"
                />

                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />

                <Tooltip />

                <Bar
                  dataKey="count"
                  radius={[6, 6, 0, 0]}
                  barSize={42}
                />

              </BarChart>

            </ResponsiveContainer>

          ) : (

            <div className="chart-empty">
              No failed payment data available.
            </div>

          )}

        </div>


        {/* AI QUEUE */}

        <div className="card">

          <div className="section-card-header">

            <div>
              <span className="card-eyebrow">
                AI RECOVERY ENGINE
              </span>

              <h3>Priority Queue</h3>

              <p>
                Highest-priority recovery opportunities.
              </p>
            </div>

            <button
              className="ai-badge ai-badge-button"
              onClick={openRecovery}
            >
              AI ACTIVE
            </button>

          </div>


          <div className="table-wrap">

            <table>

              <thead>

                <tr>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Probability</th>
                  <th>Decision</th>
                </tr>

              </thead>

              <tbody>

                {opportunities.length ? (

                  opportunities
                    .slice(0, 5)
                    .map((item) => (

                      <tr key={item.id}>

                        <td>
                          <div className="customer-cell">

                            <div className="customer-avatar">
                              {item.customer_name
                                ?.charAt(0)
                                ?.toUpperCase()}
                            </div>

                            <strong>
                              {item.customer_name}
                            </strong>

                          </div>
                        </td>


                        <td>
                          <strong>
                            {money(item.amount)}
                          </strong>
                        </td>


                        <td>
                          <span className="probability-badge">
                            {item.recovery_probability}%
                          </span>
                        </td>


                        <td>

                          <button
                            className="decision-link"
                            onClick={() =>
                              setSelectedDecision(item)
                            }
                          >
                            Why this decision?
                          </button>

                        </td>

                      </tr>

                    ))

                ) : (

                  <tr>
                    <td
                      colSpan="4"
                      className="empty-table"
                    >
                      No active recovery opportunities.
                    </td>
                  </tr>

                )}

              </tbody>

            </table>

          </div>


          {opportunities.length > 0 && (

            <button
              className="secondary-action"
              onClick={openRecovery}
            >
              View Full Recovery Queue →
            </button>

          )}

        </div>

      </div>


      {/* GUARDRAILS */}

      <div className="card guardrail-card">

        <div className="section-card-header">

          <div>
            <span className="card-eyebrow">
              RECOVERY SAFETY
            </span>

            <h3>AI Guardrails</h3>

            <p>
              AI recommendations are validated before
              recovery execution.
            </p>
          </div>

          <button
            className="guardrail-view-button"
            onClick={openAudit}
          >
            View Audit Trail →
          </button>

        </div>


        <div className="guardrail-grid">

          <div className="guardrail-item">
            <div className="guardrail-check">✓</div>

            <div>
              <strong>60% minimum probability</strong>
              <span>
                Low-confidence recovery is escalated.
              </span>
            </div>
          </div>


          <div className="guardrail-item">
            <div className="guardrail-check">✓</div>

            <div>
              <strong>Maximum 3 retries</strong>
              <span>
                Prevents excessive payment attempts.
              </span>
            </div>
          </div>


          <div className="guardrail-item">
            <div className="guardrail-check">✓</div>

            <div>
              <strong>High-value approval</strong>
              <span>
                Large transactions require merchant review.
              </span>
            </div>
          </div>


          <div className="guardrail-item">
            <div className="guardrail-check">✓</div>

            <div>
              <strong>Already recovered blocked</strong>
              <span>
                Prevents duplicate recovery execution.
              </span>
            </div>
          </div>

        </div>

      </div>


      {/* RECOVERY ARCHITECTURE */}

      <div className="card recovery-pipeline-card">

        <div className="section-card-header">

          <div>

            <span className="card-eyebrow">
              RECOVERY ARCHITECTURE
            </span>

            <h3>
              AI Recovery Decision Pipeline
            </h3>

            <p>
              Every failed payment follows a controlled
              recovery process.
            </p>

          </div>

        </div>


        <div className="recovery-pipeline">

          <div
            className="pipeline-step pipeline-clickable"
            onClick={openPayments}
          >
            <div className="pipeline-number">
              01
            </div>

            <div>
              <strong>Detect</strong>
              <span>
                Failed payment identified
              </span>
            </div>
          </div>


          <div className="pipeline-arrow">
            →
          </div>


          <div
            className="pipeline-step pipeline-clickable"
            onClick={openRecovery}
          >
            <div className="pipeline-number">
              02
            </div>

            <div>
              <strong>Analyze</strong>
              <span>
                AI recovery probability
              </span>
            </div>
          </div>


          <div className="pipeline-arrow">
            →
          </div>


          <div
            className="pipeline-step pipeline-clickable"
            onClick={openAudit}
          >
            <div className="pipeline-number">
              03
            </div>

            <div>
              <strong>Guardrail</strong>
              <span>
                Policy validation
              </span>
            </div>
          </div>


          <div className="pipeline-arrow">
            →
          </div>


          <div
            className="pipeline-step pipeline-clickable"
            onClick={openAnalytics}
          >
            <div className="pipeline-number">
              04
            </div>

            <div>
              <strong>Recover</strong>
              <span>
                Bounded execution
              </span>
            </div>
          </div>

        </div>

      </div>


      {/* WHY THIS DECISION MODAL */}

      {selectedDecision && (

        <div
          className="decision-overlay"
          onClick={() => setSelectedDecision(null)}
        >

          <div
            className="decision-modal"
            onClick={(e) => e.stopPropagation()}
          >

            <div className="decision-modal-header">

              <div>
                <span className="card-eyebrow">
                  EXPLAINABLE AI
                </span>

                <h3>Why this decision?</h3>
              </div>

              <button
                className="modal-close"
                onClick={() => setSelectedDecision(null)}
              >
                ×
              </button>

            </div>


            <div className="decision-customer">

              <div className="customer-avatar large">
                {selectedDecision.customer_name
                  ?.charAt(0)
                  ?.toUpperCase()}
              </div>

              <div>
                <strong>
                  {selectedDecision.customer_name}
                </strong>

                <span>
                  {money(selectedDecision.amount)} payment
                </span>
              </div>

            </div>


            <div className="decision-score">

              <span>Recovery Probability</span>

              <strong>
                {selectedDecision.recovery_probability}%
              </strong>

            </div>


            <div className="decision-details">

              <div>
                <span>Failure Reason</span>
                <strong>
                  {selectedDecision.failure_reason}
                </strong>
              </div>

              <div>
                <span>Recommended Action</span>
                <strong>
                  {selectedDecision.recommended_action}
                </strong>
              </div>

              <div>
                <span>Customer Segment</span>
                <strong>
                  {selectedDecision.customer_segment || "N/A"}
                </strong>
              </div>

              <div>
                <span>Success Rate</span>
                <strong>
                  {selectedDecision.success_rate || "N/A"}%
                </strong>
              </div>

            </div>


            <div className="decision-reason">

              <span>Decision Reason</span>

              <p>
                {selectedDecision.reason ||
                  "The recovery engine selected this action based on payment risk and recovery probability."}
              </p>

            </div>


            <div className="decision-guardrail">

              <div className="guardrail-check">
                ✓
              </div>

              <div>
                <strong>
                  Guardrail validation
                </strong>

                <span>
                  Recovery execution is controlled by
                  the 60% probability threshold.
                </span>
              </div>

            </div>


            <button
              className="primary full-width"
              onClick={openRecovery}
            >
              Open Recovery Opportunity →
            </button>

          </div>

        </div>

      )}

    </div>
  );
}