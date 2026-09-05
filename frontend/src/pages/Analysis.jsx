import { useState } from "react";
import { api } from "../services/api";

const money = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;

export default function Analysis({ id, onBack }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function analyze() {
    setLoading(true);
    setMessage("");

    try {
      const { data } = await api.post("/recovery/analyze", {
        transactionId: id,
      });

      console.log("AI Analysis Response:", data);

      const analysis =
        data?.analysis || data?.recoveryAction || data;

      setResult({
        id:
          analysis?.id ||
          data?.recoveryAction?.id ||
          data?.recovery_action_id ||
          null,

        recovery_score:
          analysis?.recovery_probability ??
          analysis?.recovery_score ??
          data?.intelligence?.recovery_probability ??
          0,

        priority:
          analysis?.priority ||
          data?.intelligence?.priority ||
          "MEDIUM",

        recommended_action:
          analysis?.recommended_action ||
          data?.intelligence?.recommended_action ||
          data?.recoveryAction?.recommended_action ||
          "SEND_REMINDER",

        reason:
          analysis?.reason ||
          data?.intelligence?.reason ||
          "The recovery recommendation is based on payment and customer history.",

        personalized_message:
          analysis?.personalized_message ||
          data?.intelligence?.personalized_message ||
          data?.recoveryAction?.personalized_message ||
          "Please review your payment method and try again.",

        policy: data?.policy || null,
        rootCause: data?.rootCause || null,
      });
    } catch (error) {
      console.error("Analysis error:", error);
      setMessage("Analysis failed. Check backend and database.");
    } finally {
      setLoading(false);
    }
  }

  async function approve() {
    if (!id) {
      setMessage("Transaction ID not found.");
      return;
    }

    try {
      const { data } = await api.post("/recovery/approve", {
        transactionId: id,
      });

      setMessage(
        `Approved. Simulated recovered revenue: ${money(
          data?.recoveredAmount
        )}`
      );
    } catch (error) {
      console.error("Approval error:", error);

      setMessage(
        error?.response?.data?.message || "Approval failed."
      );
    }
  }

  const actionText = String(
    result?.recommended_action || "SEND_REMINDER"
  ).replaceAll("_", " ");

  const probability = Number(result?.recovery_score || 0);

  const decision =
    result?.policy?.decision ||
    (probability >= 60 ? "ALLOW" : "ESCALATE");

  const circumference = 2 * Math.PI * 52;
  const progress = circumference - (probability / 100) * circumference;

  return (
    <div className="analysis-page">

      {/* BACK */}
      <button className="analysis-back" onClick={onBack}>
        ← Back to payments
      </button>

      {/* HEADER */}
      <div className="analysis-header">
        <div>
          <div className="analysis-eyebrow">
            AI DECISION ENGINE
          </div>

          <h1>AI Recovery Analysis</h1>

          <p>
            Intelligent decision support for transaction{" "}
            <strong>#{id}</strong>
          </p>
        </div>

        <div className="analysis-status">
          <span className="status-dot"></span>
          Analysis Ready
        </div>
      </div>

      {/* BEFORE ANALYSIS */}
      {!result ? (
        <div className="analysis-start-card">

          <div className="analysis-start-icon">
            ✦
          </div>

          <h2>Analyze this failed payment</h2>

          <p>
            Our recovery engine evaluates transaction signals,
            customer history, failure reason and recovery rules
            to recommend the safest action.
          </p>

          <div className="analysis-flow">
            <div>
              <span>01</span>
              Transaction
            </div>

            <i>→</i>

            <div>
              <span>02</span>
              AI Analysis
            </div>

            <i>→</i>

            <div>
              <span>03</span>
              Guardrails
            </div>

            <i>→</i>

            <div>
              <span>04</span>
              Action
            </div>
          </div>

          <button
            className="analysis-run-btn"
            onClick={analyze}
            disabled={loading}
          >
            <span>{loading ? "◌" : "✦"}</span>
            {loading ? "Analyzing Transaction..." : "Analyze Transaction"}
          </button>

          {message && (
            <div className="analysis-error">
              {message}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* TOP GRID */}
          <div className="analysis-top-grid">

            {/* SCORE CARD */}
            <div className="analysis-score-card">

              <div className="score-card-header">
                <div>
                  <div className="section-label">
                    RECOVERY PROBABILITY
                  </div>

                  <div className="score-caption">
                    AI confidence score
                  </div>
                </div>

                <div className="ai-mini-badge">
                  AI
                </div>
              </div>

              <div className="score-ring-wrapper">

                <svg
                  className="score-ring"
                  width="150"
                  height="150"
                  viewBox="0 0 120 120"
                >
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    className="score-ring-bg"
                  />

                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    className="score-ring-progress"
                    strokeDasharray={circumference}
                    strokeDashoffset={progress}
                  />
                </svg>

                <div className="score-ring-value">
                  <strong>{probability}%</strong>
                  <span>confidence</span>
                </div>

              </div>

              <div
                className={`priority-badge ${
                  String(result.priority).toLowerCase()
                }`}
              >
                <span>●</span>
                {result.priority} PRIORITY
              </div>

            </div>

            {/* DECISION CARD */}
            <div className="analysis-decision-card">

              <div className="section-label">
                GUARDRAIL DECISION
              </div>

              <div
                className={`decision-status ${
                  decision.toLowerCase()
                }`}
              >
                <div className="decision-icon">
                  {decision === "ALLOW" ? "✓" : "!"}
                </div>

                <div>
                  <strong>{decision}</strong>

                  <span>
                    {decision === "ALLOW"
                      ? "Recovery action is within policy limits"
                      : "Manual review is required before recovery"}
                  </span>
                </div>
              </div>

              <div className="decision-reasons">

                {result.policy?.reasons?.length > 0 ? (
                  result.policy.reasons.map((reason, index) => (
                    <div
                      className="decision-reason-item"
                      key={index}
                    >
                      <span>✓</span>
                      {reason}
                    </div>
                  ))
                ) : (
                  <>
                    <div className="decision-reason-item">
                      <span>✓</span>
                      Recovery probability evaluated
                    </div>

                    <div className="decision-reason-item">
                      <span>✓</span>
                      Policy guardrails evaluated
                    </div>

                    <div className="decision-reason-item">
                      <span>✓</span>
                      Recommended action generated
                    </div>
                  </>
                )}

              </div>

            </div>

            {/* ACTION CARD */}
            <div className="analysis-action-card">

              <div className="section-label">
                RECOMMENDED ACTION
              </div>

              <div className="recommended-action">
                <div className="action-icon">
                  ↻
                </div>

                <div>
                  <strong>{actionText}</strong>

                  <span>
                    AI-selected recovery strategy
                  </span>
                </div>
              </div>

              <div className="why-section">

                <div className="why-title">
                  <span>✦</span>
                  Why this action?
                </div>

                <p>
                  {result.reason}
                </p>

              </div>

            </div>

          </div>

          {/* ROOT CAUSE */}
          <div className="analysis-section-card">

            <div className="section-heading">

              <div className="heading-icon">
                ⚙
              </div>

              <div>
                <h3>Root Cause Analysis</h3>
                <p>
                  Identified reason behind the payment failure
                </p>
              </div>

            </div>

            <div className="root-cause-content">

              <div className="root-cause-badge">
                <span>●</span>

                {result.rootCause
                  ? typeof result.rootCause === "object"
                    ? result.rootCause.label ||
                      result.rootCause.name ||
                      result.rootCause.reason ||
                      result.rootCause.description ||
                      "Payment Failure"
                    : String(result.rootCause).replaceAll("_", " ")
                  : "Technical Failure"}
              </div>

              <div className="root-cause-line"></div>

              <div className="root-cause-note">
                Recovery recommendation generated using
                transaction and customer signals.
              </div>

            </div>

          </div>

          {/* CUSTOMER MESSAGE */}
          <div className="analysis-message-card">

            <div className="message-header">

              <div className="section-heading">

                <div className="heading-icon message-icon">
                  ✉
                </div>

                <div>
                  <h3>Personalized Recovery Message</h3>
                  <p>
                    Customer-facing communication generated
                    for this recovery attempt
                  </p>
                </div>

              </div>

              <span className="generated-badge">
                ✦ AI Generated
              </span>

            </div>

            <div className="customer-message">

              <div className="message-avatar">
                AI
              </div>

              <div className="message-content">

                <div className="message-label">
                  CUSTOMER MESSAGE
                </div>

                <p>
                  {result.personalized_message}
                </p>

              </div>

            </div>

            {/* ACTIONS */}
            <div className="analysis-actions">

              <button
                className="approve-btn"
                onClick={approve}
                disabled={
                  !result.id ||
                  decision !== "ALLOW"
                }
              >
                <span>✓</span>

                {decision === "ALLOW"
                  ? "Approve Recovery"
                  : "Approval Required"}
              </button>

              <button
                className="reject-btn"
                onClick={() =>
                  setMessage(
                    "Recovery recommendation rejected."
                  )
                }
              >
                Reject
              </button>

            </div>

            {message && (
              <div className="analysis-success">
                ✓ {message}
              </div>
            )}

          </div>

          {/* DECISION FLOW */}
          <div className="analysis-section-card">

            <div className="section-heading">

              <div className="heading-icon">
                ◈
              </div>

              <div>
                <h3>AI Decision Flow</h3>
                <p>
                  How the recovery recommendation was produced
                </p>
              </div>

            </div>

            <div className="decision-flow">

              <div className="flow-step">
                <div className="flow-number">01</div>
                <div className="flow-icon">₹</div>
                <strong>Transaction</strong>
                <span>Payment signals</span>
              </div>

              <div className="flow-arrow">→</div>

              <div className="flow-step">
                <div className="flow-number">02</div>
                <div className="flow-icon">✦</div>
                <strong>AI Analysis</strong>
                <span>Recovery scoring</span>
              </div>

              <div className="flow-arrow">→</div>

              <div className="flow-step">
                <div className="flow-number">03</div>
                <div className="flow-icon">✓</div>
                <strong>Guardrails</strong>
                <span>Policy validation</span>
              </div>

              <div className="flow-arrow">→</div>

              <div className="flow-step">
                <div className="flow-number">04</div>
                <div className="flow-icon">↻</div>
                <strong>{actionText}</strong>
                <span>Recovery action</span>
              </div>

            </div>

          </div>
        </>
      )}

    </div>
  );
}