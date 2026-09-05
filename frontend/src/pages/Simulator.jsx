import { useState } from "react";
import { api } from "../services/api";

export default function Simulator() {
  const [smartRetry, setSmartRetry] = useState(true);
  const [messaging, setMessaging] = useState(true);
  const [alternatePayment, setAlternatePayment] = useState(false);
  const [adaptive, setAdaptive] = useState(true);

  const [paymentCount, setPaymentCount] = useState(100);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const summary = result?.summary || {};
  const outcomes = result?.outcomes || {};
  const guardrails = result?.guardrails || {};
  const strategies = result?.strategies || [];

  const transactions = Array.from(
    new Map(
      (result?.transactions || []).map((item) => [
        item.transactionId,
        item,
      ])
    ).values()
  );

  async function runSimulation() {
    try {
      setLoading(true);
      setError("");
      setResult(null);

      const selectedStrategies = [];

      if (smartRetry) selectedStrategies.push("smart_retry");
      if (messaging)
        selectedStrategies.push("personalized_messaging");
      if (alternatePayment)
        selectedStrategies.push("alternate_payment");
      if (adaptive) selectedStrategies.push("ai_adaptive");

      if (selectedStrategies.length === 0) {
        setError("Please select at least one recovery strategy.");
        setLoading(false);
        return;
      }

      const response = await api.post("/simulator/run", {
        numberOfPayments: Number(paymentCount),
        strategies: selectedStrategies,
      });

      console.log("SIMULATION RESPONSE:", response.data);

      const data = response.data?.data ?? response.data;

      if (!data?.summary) {
        throw new Error("Invalid simulation response from server.");
      }

      setResult(data);
    } catch (err) {
      console.error("Simulation error:", err);

      setError(
        err.response?.data?.message ||
          err.message ||
          "Simulation failed"
      );
    } finally {
      setLoading(false);
    }
  }

  const money = (value) =>
    `₹${Number(value || 0).toLocaleString("en-IN", {
      maximumFractionDigits: 0,
    })}`;

  const strategyName = (name) => {
    const names = {
      smart_retry: "Smart Retry",
      personalized_messaging: "Personalized Messaging",
      alternate_payment: "Alternate Payment",
      ai_adaptive: "AI Adaptive",
    };

    return names[name] || name;
  };

  const statusClass = (status) => {
    const value = String(status || "").toUpperCase();

    if (
      value.includes("ALLOW") ||
      value.includes("RECOVER")
    ) {
      return "status-success";
    }

    if (
      value.includes("ESCALAT") ||
      value.includes("RETRY")
    ) {
      return "status-warning";
    }

    if (
      value.includes("BLOCK") ||
      value.includes("STOP")
    ) {
      return "status-danger";
    }

    return "status-neutral";
  };

  /*
   * IMPORTANT:
   * These values come directly from backend.
   */
  const revenueAtRisk = Number(
    summary.revenueAtRisk || 0
  );

  const baselineRevenue = Number(
    summary.baselineRevenue ??
      summary.currentExpectedRecovery ??
      0
  );

  const aiRevenue = Number(
    summary.aiRevenue ??
      summary.recoveredRevenue ??
      0
  );

  const incrementalRevenue = Math.max(
    0,
    Number(
      summary.incrementalRevenue ??
        summary.additionalRecovery ??
        aiRevenue - baselineRevenue
    )
  );

  const baselineRate =
    revenueAtRisk > 0
      ? (baselineRevenue / revenueAtRisk) * 100
      : 0;

  const aiRate =
    revenueAtRisk > 0
      ? (aiRevenue / revenueAtRisk) * 100
      : 0;

  return (
    <div className="simulator-page">
      <div className="simulator-container">

        {/* ================= HEADER ================= */}

        <div className="simulator-header">
          <div>
            <div className="simulator-eyebrow">
              <span className="simulator-eyebrow-dot"></span>
              AI Revenue Intelligence
            </div>

            <h1 className="simulator-title">
              Recovery Simulator
            </h1>

            <p className="simulator-subtitle">
              Simulate AI recovery strategies, measure potential revenue
              recovery and validate decisions before execution.
            </p>
          </div>

          <div className="engine-active">
            <span className="engine-dot"></span>
            Recovery Engine Active
          </div>
        </div>

        {/* ================= CONFIGURATION ================= */}

        <div className="sim-config">
          <div className="sim-config-header">
            <div>
              <h2 className="sim-config-title">
                Simulation Configuration
              </h2>

              <p className="sim-config-description">
                Configure the batch size and recovery strategies.
              </p>
            </div>
          </div>

          <div className="sim-config-body">

            {/* PAYMENT COUNT */}

            <div className="sim-section">
              <div className="sim-section-title">
                Failed Payments to Simulate
              </div>

              <div className="payment-options">
                {[50, 100, 250, 500].map((count) => (
                  <button
                    key={count}
                    type="button"
                    className={`payment-option ${
                      paymentCount === count
                        ? "selected"
                        : ""
                    }`}
                    onClick={() => setPaymentCount(count)}
                  >
                    <span className="payment-number">
                      {count}
                    </span>

                    <span className="payment-label">
                      Payments
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* STRATEGIES */}

            <div className="sim-section">
              <div className="sim-section-heading">
                <div>
                  <h3 className="sim-section-title">
                    Recovery Strategies
                  </h3>

                  <p className="strategy-description">
                    Select the strategies you want to compare.
                  </p>
                </div>
              </div>

              <div className="strategy-grid">

                <StrategyCard
                  checked={smartRetry}
                  onChange={setSmartRetry}
                  title="Smart Retry"
                  description="Retry failed payments at an optimized time."
                  icon="↻"
                />

                <StrategyCard
                  checked={messaging}
                  onChange={setMessaging}
                  title="Personalized Messaging"
                  description="Send customer-specific recovery reminders."
                  icon="✉"
                />

                <StrategyCard
                  checked={alternatePayment}
                  onChange={setAlternatePayment}
                  title="Alternate Payment"
                  description="Suggest another payment method."
                  icon="↗"
                />

                <StrategyCard
                  checked={adaptive}
                  onChange={setAdaptive}
                  title="AI Adaptive Strategy"
                  description="Dynamically choose the best recovery action."
                  icon="✦"
                />
              </div>
            </div>

            {/* RUN BUTTON */}

            <div className="sim-run-row">
              <button
                type="button"
                onClick={runSimulation}
                disabled={loading}
                className="sim-run-btn"
              >
                {loading ? (
                  <>
                    <span className="sim-spinner"></span>
                    Running Simulation...
                  </>
                ) : (
                  <>
                    Run Simulation
                    <span className="sim-run-arrow">
                      →
                    </span>
                  </>
                )}
              </button>

              <div className="sim-run-help">
                {loading
                  ? "Processing recovery scenarios..."
                  : "AI decision → Guardrail validation → Recovery outcome"}
              </div>
            </div>

            {/* ERROR */}

            {error && (
              <div className="sim-error">
                <div className="sim-error-title">
                  Simulation Error
                </div>

                <div className="sim-error-message">
                  {error}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ================= RESULTS ================= */}

        {result && (
          <div className="sim-results">

            {/* RESULTS HEADER */}

            <div className="results-header">
              <div>
                <div className="results-title-row">
                  <h2 className="results-title">
                    Simulation Results
                  </h2>

                  <span className="completed-badge">
                    COMPLETED
                  </span>
                </div>

                <p className="results-subtitle">
                  AI decision → Guardrail validation → Recovery outcome
                </p>
              </div>

              <div className="results-count">
                {summary.paymentsSimulated || 0} payments analyzed
              </div>
            </div>

            {/* ================= MONEY RECOVERY ================= */}

            <div className="money-recovery-section">

              <div className="money-recovery-header">
                <div>
                  <div className="money-recovery-eyebrow">
                    REVENUE IMPACT
                  </div>

                  <h2 className="money-recovery-title">
                    Money Recovery Performance
                  </h2>

                  <p className="money-recovery-subtitle">
                    Compare baseline recovery against AI-driven recovery.
                  </p>
                </div>

                <div className="money-recovery-badge">
                  AI MEASURED
                </div>
              </div>

              <div className="money-recovery-grid">

                {/* REVENUE AT RISK */}

                <div className="money-card">
                  <div className="money-card-label">
                    Revenue At Risk
                  </div>

                  <div className="money-card-value">
                    {money(revenueAtRisk)}
                  </div>

                  <div className="money-card-description">
                    Failed payment value exposed to recovery
                  </div>
                </div>

                {/* BASELINE */}

                <div className="money-card">
                  <div className="money-card-label">
                    Baseline Recovery
                  </div>

                  <div className="money-card-value">
                    {money(baselineRevenue)}
                  </div>

                  <div className="money-card-description">
                    Expected recovery without AI
                  </div>

                  <div className="money-card-rate">
                    {baselineRate.toFixed(1)}% baseline
                  </div>
                </div>

                {/* AI */}

                <div className="money-card">
                  <div className="money-card-label">
                    AI Recovery
                  </div>

                  <div className="money-card-value">
                    {money(aiRevenue)}
                  </div>

                  <div className="money-card-description">
                    Recovery generated through AI decisions
                  </div>

                  <div className="money-card-rate">
                    {aiRate.toFixed(1)}% AI recovery
                  </div>
                </div>

                {/* INCREMENTAL */}

                <div className="money-card incremental-card">

                  <div className="money-card-label">
                    Incremental Revenue Recovered
                  </div>

                  <div className="incremental-value">
                    +{money(incrementalRevenue)}
                  </div>

                  <div className="money-card-description">
                    Additional money recovered above baseline
                  </div>

                  <div className="incremental-highlight">
                    AI impact
                  </div>

                </div>

              </div>

              {/* MONEY FLOW */}

              <div className="money-flow">

                <div className="money-flow-item">
                  <span>Revenue At Risk</span>
                  <strong>{money(revenueAtRisk)}</strong>
                </div>

                <span className="money-flow-arrow">
                  →
                </span>

                <div className="money-flow-item">
                  <span>Baseline</span>
                  <strong>{money(baselineRevenue)}</strong>
                </div>

                <span className="money-flow-arrow">
                  →
                </span>

                <div className="money-flow-item ai-flow">
                  <span>AI Recovery</span>
                  <strong>{money(aiRevenue)}</strong>
                </div>

                <span className="money-flow-arrow">
                  →
                </span>

                <div className="money-flow-item incremental-flow">
                  <span>Incremental</span>
                  <strong>
                    +{money(incrementalRevenue)}
                  </strong>
                </div>

              </div>
            </div>

            {/* ================= KPI ================= */}

            <div className="kpi-grid">

              <MetricCard
                title="Revenue At Risk"
                value={money(summary.revenueAtRisk)}
                description="Total failed payment value"
                icon="₹"
              />

              <MetricCard
                title="Expected Recovery"
                value={money(summary.currentExpectedRecovery)}
                description="Current baseline recovery"
                icon="↗"
              />

              <MetricCard
                title="AI Recovery"
                value={money(summary.recoveredRevenue)}
                description="Recovery with AI strategy"
                icon="✦"
              />

              <MetricCard
                title="Additional Recovery"
                value={`+${money(summary.additionalRecovery)}`}
                description="Potential incremental revenue"
                icon="+"
              />
            </div>

            {/* ================= OVERVIEW ================= */}

            <div className="result-columns">

              {/* RECOVERY RATE */}

              <div className="result-card recovery-overview">

                <div className="recovery-overview-top">
                  <div>
                    <p className="result-card-label">
                      AI Recovery Rate
                    </p>

                    <p className="recovery-rate-value">
                      {summary.recoveryRate || 0}%
                    </p>
                  </div>

                  <span className="analysis-badge">
                    BATCH ANALYSIS
                  </span>
                </div>

                <div className="recovery-progress">

                  <div className="recovery-progress-label">
                    <span>AI recovery progress</span>
                    <span>
                      {summary.recoveryRate || 0}%
                    </span>
                  </div>

                  <div className="progress-bg">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${Math.min(
                          Number(
                            summary.recoveryRate || 0
                          ),
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="recovery-stats">

                  <div>
                    <p className="stat-label">
                      Payments simulated
                    </p>

                    <p className="stat-value">
                      {summary.paymentsSimulated || 0}
                    </p>
                  </div>

                  <div>
                    <p className="stat-label">
                      Revenue recovered
                    </p>

                    <p className="stat-value">
                      {money(summary.recoveredRevenue)}
                    </p>
                  </div>
                </div>
              </div>

              {/* RECOMMENDATION */}

              <div className="recommendation-card">

                <div className="recommendation-top">

                  <div className="recommendation-icon">
                    ✦
                  </div>

                  <span className="recommendation-badge">
                    AI RECOMMENDED
                  </span>

                </div>

                <p className="recommendation-label">
                  Recommended Strategy
                </p>

                <h3 className="recommendation-title">
                  {strategyName(
                    result?.recommendation?.strategy ||
                      summary.recommendedStrategy ||
                      "AI Adaptive"
                  )}
                </h3>

                <p className="recommendation-text">
                  {result?.recommendation?.reason ||
                    "Highest incremental revenue recovery among the selected strategies."}
                </p>

                <div className="recommendation-points">

                  <div>
                    <span>✓</span>
                    Guardrails validated
                  </div>

                  <div>
                    <span>✓</span>
                    Measured recovery
                  </div>

                  <div>
                    <span>✓</span>
                    Incremental revenue tracked
                  </div>

                </div>
              </div>
            </div>

            {/* ================= STRATEGY PERFORMANCE ================= */}

            <div className="result-card strategy-performance">

              <div className="result-card-header">
                <div>
                  <h2 className="result-card-title">
                    Strategy Performance
                  </h2>

                  <p className="result-card-subtitle">
                    Compare expected recovery across selected strategies.
                  </p>
                </div>
              </div>

              <div className="strategy-performance-list">

                {strategies.length === 0 ? (
                  <div className="empty-state">
                    No strategy data available.
                  </div>
                ) : (
                  strategies.map((strategy, index) => {

                    const rate = Number(
                      strategy.recoveryRate || 0
                    );

                    return (
                      <div
                        className="strategy-row"
                        key={index}
                      >

                        <div className="strategy-row-head">

                          <div className="strategy-row-info">

                            <div className="strategy-rank">
                              {index + 1}
                            </div>

                            <div>
                              <p className="strategy-row-name">
                                {strategyName(
                                  strategy.strategy
                                )}
                              </p>

                              <p className="strategy-row-revenue">
                                Expected recovery:{" "}
                                {money(
                                  strategy.recoveredRevenue
                                )}
                              </p>

                              {strategy.incrementalRevenue !==
                                undefined && (
                                <p className="strategy-row-revenue">
                                  Incremental:{" "}
                                  <strong>
                                    +
                                    {money(
                                      strategy.incrementalRevenue
                                    )}
                                  </strong>
                                </p>
                              )}
                            </div>
                          </div>

                          <p className="strategy-row-rate">
                            {rate.toFixed(1)}%
                          </p>
                        </div>

                        <div className="progress-bg">
                          <div
                            className="progress-fill"
                            style={{
                              width: `${Math.min(
                                rate,
                                100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* ================= OUTCOMES + GUARDRAILS ================= */}

            <div className="result-columns">

              {/* OUTCOMES */}

              <div className="result-card">

                <div className="result-card-header">

                  <h2 className="result-card-title">
                    Recovery Outcomes
                  </h2>

                  <p className="result-card-subtitle">
                    Final decision distribution from the simulation.
                  </p>

                </div>

                <div className="outcome-grid">

                  <OutcomeCard
                    label="Recovered"
                    value={outcomes.recovered ?? 0}
                    icon="✓"
                  />

                  <OutcomeCard
                    label="Retry Scheduled"
                    value={outcomes.retryScheduled ?? 0}
                    icon="↻"
                  />

                  <OutcomeCard
                    label="Escalated"
                    value={outcomes.escalated ?? 0}
                    icon="!"
                  />

                  <OutcomeCard
                    label="Guardrail Stopped"
                    value={outcomes.stopped ?? 0}
                    icon="■"
                  />

                </div>
              </div>

              {/* GUARDRAILS */}

              <div className="result-card">

                <div className="guardrail-header">

                  <div className="guardrail-icon">
                    🛡️
                  </div>

                  <div>
                    <h2 className="result-card-title">
                      Recovery Guardrails
                    </h2>

                    <p className="result-card-subtitle">
                      AI recommendations are validated before execution.
                    </p>
                  </div>
                </div>

                <div className="guardrail-grid">

                  <GuardrailCard
                    title="Max Retries"
                    value={
                      guardrails.maxRetryAttempts ?? 3
                    }
                  />

                  <GuardrailCard
                    title="Min Probability"
                    value={`${guardrails.minimumProbability ?? 60}%`}
                  />

                  <GuardrailCard
                    title="High Value"
                    value={
                      guardrails.highValueApproval
                        ? "Approval"
                        : "No"
                    }
                  />

                </div>

                <div className="guardrail-list">

                  <GuardrailItem text="Stop after successful payment" />

                  <GuardrailItem text="Stop when retry limit is reached" />

                  <GuardrailItem text="Escalate low-confidence decisions" />

                  <GuardrailItem text="Require approval for high-value transactions" />

                </div>
              </div>
            </div>

            {/* ================= DECISIONS ================= */}

            <div className="result-card decisions-card">

              <div className="decisions-header">

                <div>
                  <h2 className="result-card-title">
                    Recovery Decisions
                  </h2>

                  <p className="result-card-subtitle">
                    Sample transaction-level decisions from the simulation.
                  </p>
                </div>

              </div>

              <div className="decisions-table-wrapper">

                {transactions.length === 0 ? (
                  <div className="empty-state">
                    No transaction decisions available.
                  </div>
                ) : (
                  <table className="decisions-table">

                    <thead>
                      <tr>
                        <th>Customer</th>
                        <th>Amount</th>
                        <th>Probability</th>
                        <th>Strategy</th>
                        <th>Guardrail</th>
                        <th>Outcome</th>
                        <th>Decision Reason</th>
                      </tr>
                    </thead>

                    <tbody>

                      {transactions.map(
                        (item, index) => (
                          <tr
                            key={
                              item.transactionId ||
                              index
                            }
                          >

                            <td>
                              <div className="customer-cell">

                                <p className="customer-name">
                                  {item.customer}
                                </p>

                                <p className="transaction-id">
                                  Transaction #
                                  {item.transactionId}
                                </p>

                              </div>
                            </td>

                            <td>
                              <strong>
                                {money(item.amount)}
                              </strong>
                            </td>

                            <td>
                              <strong>
                                {item.recoveryProbability}%
                              </strong>
                            </td>

                            <td>
                              {strategyName(
                                item.action
                              )}
                            </td>

                            <td>
                              <span
                                className={`status-badge ${statusClass(
                                  item.guardrail
                                )}`}
                              >
                                {item.guardrail}
                              </span>
                            </td>

                            <td>
                              <span
                                className={`status-badge ${statusClass(
                                  item.outcome
                                )}`}
                              >
                                {item.outcome}
                              </span>
                            </td>

                            <td>
                              <div className="decision-reason">

                                <span className="decision-reason-icon">
                                  💡
                                </span>

                                <div>

                                  <p className="decision-reason-title">
                                    Why this decision?
                                  </p>

                                  <p className="decision-reason-text">
                                    {item.decisionReason ||
                                      "Decision based on recovery probability, payment history and recovery policy."}
                                  </p>

                                </div>

                              </div>
                            </td>

                          </tr>
                        )
                      )}

                    </tbody>
                  </table>
                )}

              </div>
            </div>

            {/* ================= PIPELINE ================= */}

            <div className="pipeline-card">

              <div className="pipeline-content">

                <div>
                  <p className="pipeline-label">
                    Recovery Decision Pipeline
                  </p>

                  <h2 className="pipeline-title">
                    AI → Policy → Guardrails → Recovery → Audit
                  </h2>

                  <p className="pipeline-description">
                    Every recovery recommendation passes through bounded
                    controls before execution.
                  </p>
                </div>

                <div className="pipeline-steps">

                  <PipelineStep text="AI Decision" />
                  <PipelineArrow />

                  <PipelineStep text="Policy" />
                  <PipelineArrow />

                  <PipelineStep text="Guardrails" />
                  <PipelineArrow />

                  <PipelineStep text="Recovery" />
                  <PipelineArrow />

                  <PipelineStep text="Audit Trail" />

                </div>

              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

/* ======================================================
   STRATEGY CARD
====================================================== */

function StrategyCard({
  checked,
  onChange,
  title,
  description,
  icon,
}) {
  return (
    <label
      className={`strategy-card ${
        checked ? "selected" : ""
      }`}
    >
      <input
        type="checkbox"
        className="strategy-checkbox"
        checked={checked}
        onChange={(e) =>
          onChange(e.target.checked)
        }
      />

      <div className="strategy-content">

        <div className="strategy-icon">
          {icon}
        </div>

        <div>
          <p className="strategy-name">
            {title}
          </p>

          <p className="strategy-text">
            {description}
          </p>
        </div>

      </div>
    </label>
  );
}

/* ======================================================
   METRIC CARD
====================================================== */

function MetricCard({
  title,
  value,
  description,
  icon,
}) {
  return (
    <div className="kpi-card">

      <div className="kpi-card-top">

        <p className="kpi-label">
          {title}
        </p>

        <div className="kpi-icon">
          {icon}
        </div>

      </div>

      <p className="kpi-value">
        {value}
      </p>

      <p className="kpi-description">
        {description}
      </p>

    </div>
  );
}

/* ======================================================
   OUTCOME CARD
====================================================== */

function OutcomeCard({
  label,
  value,
  icon,
}) {
  return (
    <div className="outcome-card">

      <div className="outcome-card-top">

        <p className="outcome-label">
          {label}
        </p>

        <span className="outcome-icon">
          {icon}
        </span>

      </div>

      <p className="outcome-value">
        {value}
      </p>

    </div>
  );
}

/* ======================================================
   GUARDRAIL CARD
====================================================== */

function GuardrailCard({
  title,
  value,
}) {
  return (
    <div className="guardrail-box">

      <p className="guardrail-label">
        {title}
      </p>

      <p className="guardrail-value">
        {value}
      </p>

    </div>
  );
}

/* ======================================================
   GUARDRAIL ITEM
====================================================== */

function GuardrailItem({
  text,
}) {
  return (
    <div className="guardrail-item">

      <span className="guardrail-check">
        ✓
      </span>

      <span>
        {text}
      </span>

    </div>
  );
}

/* ======================================================
   PIPELINE
====================================================== */

function PipelineStep({
  text,
}) {
  return (
    <span className="pipeline-step">
      {text}
    </span>
  );
}

function PipelineArrow() {
  return (
    <span className="pipeline-arrow">
      →
    </span>
  );
}