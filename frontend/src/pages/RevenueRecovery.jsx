import { useEffect, useMemo, useState } from "react";

const money = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;

export default function RevenueRecovery() {
  const [opportunities, setOpportunities] = useState([]);
  const [recovered, setRecovered] = useState([]);

  const [loading, setLoading] = useState(true);

  // Recovery Decision / Outcome modal
  const [selected, setSelected] = useState(null);

  // Merchant Approval modal
  const [approvalItem, setApprovalItem] = useState(null);
  const [approvalSubmitted, setApprovalSubmitted] = useState(false);

  const [processingId, setProcessingId] = useState(null);

  // ==========================================
  // LOAD DATA
  // ==========================================

  useEffect(() => {
    loadRecoveryData();
  }, []);

  async function loadRecoveryData() {
    try {
      setLoading(true);

      const token = localStorage.getItem("revenue_token");

      if (!token) {
        throw new Error("Authentication token not found.");
      }

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const [
        opportunitiesResponse,
        recoveredResponse,
      ] = await Promise.all([
        fetch("http://localhost:5000/api/recovery", {
          headers,
        }),

        fetch(
          "http://localhost:5000/api/recovery/recovered-history",
          {
            headers,
          }
        ),
      ]);

      const opportunitiesData =
        await opportunitiesResponse.json();

      const recoveredData =
        await recoveredResponse.json();

      if (!opportunitiesResponse.ok) {
        throw new Error(
          opportunitiesData.message ||
            "Failed to load recovery opportunities"
        );
      }

      if (!recoveredResponse.ok) {
        throw new Error(
          recoveredData.message ||
            "Failed to load recovered history"
        );
      }

      setOpportunities(
        Array.isArray(opportunitiesData)
          ? opportunitiesData
          : []
      );

      setRecovered(
        Array.isArray(recoveredData)
          ? recoveredData
          : []
      );
    } catch (error) {
      console.error(
        "Recovery page error:",
        error
      );

      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // HELPER
  // ==========================================

  function getProbability(item) {
    return Number(
      item.recovery_probability ??
        item.recovery_score ??
        item.ai_probability ??
        0
    );
  }

  function getAction(item) {
    return (
      item.recommended_action ||
      item.action ||
      "Recovery"
    );
  }

  // ==========================================
  // KPI CALCULATIONS
  // ==========================================

  const revenueAtRisk = useMemo(() => {
    return opportunities.reduce(
      (total, item) =>
        total + Number(item.amount || 0),
      0
    );
  }, [opportunities]);

  const potentialRecovery = useMemo(() => {
    return opportunities.reduce(
      (total, item) => {
        const probability =
          getProbability(item);

        const amount =
          Number(item.amount || 0);

        return (
          total +
          amount *
            (probability / 100)
        );
      },
      0
    );
  }, [opportunities]);

  const recoveredRevenue = useMemo(() => {
    return recovered.reduce(
      (total, item) =>
        total +
        Number(
          item.recovered_amount || 0
        ),
      0
    );
  }, [recovered]);

  // ==========================================
  // APPROVE & RECOVER
  // ==========================================

  async function handleRecovery(item) {
    try {
      setProcessingId(
        item.transaction_id
      );

      const token =
        localStorage.getItem(
          "revenue_token"
        );

      if (!token) {
        throw new Error(
          "Authentication token not found."
        );
      }

      // --------------------------------------
      // STEP 1: CREATE AI ANALYSIS
      // --------------------------------------

      const analyzeResponse =
        await fetch(
          "http://localhost:5000/api/recovery/analyze",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },

            body: JSON.stringify({
              transactionId:
                item.transaction_id,
            }),
          }
        );

      const analysis =
        await analyzeResponse.json();

      if (!analyzeResponse.ok) {
        throw new Error(
          analysis.message ||
            "Recovery analysis failed"
        );
      }

      // --------------------------------------
      // STEP 2: CHECK POLICY
      // --------------------------------------

      const analysisProbability =
        Number(
          analysis.recovery_score ??
            analysis.recovery_probability ??
            0
        );

      const analysisAction =
        analysis.recommended_action ||
        analysis.action;

      // BLOCK
      if (
        analysis.autopilot_decision ===
          "BLOCK" ||
        analysis.status === "blocked"
      ) {
        alert(
          `Recovery blocked.\n\n${
            analysis.reason ||
            "Recovery policy blocked this transaction."
          }`
        );

        return;
      }

      // ESCALATE
      if (
        analysis.autopilot_decision ===
          "ESCALATE" ||
        analysis.status === "escalated" ||
        analysisProbability < 60
      ) {
        setApprovalItem({
          ...item,
          ...analysis,

          transaction_id:
            item.transaction_id,

          recovery_probability:
            analysisProbability,

          recommended_action:
            analysisAction,
        });

        return;
      }

      // --------------------------------------
      // STEP 3: APPROVE / EXECUTE
      // --------------------------------------

      const approveResponse =
        await fetch(
          "http://localhost:5000/api/recovery/approve",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },

            body: JSON.stringify({
              transactionId:
                item.transaction_id,

              action:
                analysisAction,
            }),
          }
        );

      const result =
        await approveResponse.json();

      if (!approveResponse.ok) {
        throw new Error(
          result.message ||
            "Could not approve recovery"
        );
      }

      if (result.success === false) {
        alert(
          `Recovery not executed.\n\n${
            result.message ||
            "Recovery was not executed."
          }`
        );

        return;
      }

      // --------------------------------------
      // SUCCESS
      // --------------------------------------

      alert(
        `Recovery executed successfully!\n\n` +
        `Recovered Revenue: ${money(
          result.recoveredAmount
        )}`
      );

      await loadRecoveryData();
    } catch (error) {
      console.error(
        "Recovery execution error:",
        error
      );

      alert(error.message);
    } finally {
      setProcessingId(null);
    }
  }

  // ==========================================
  // MERCHANT APPROVAL
  // ==========================================

  async function handleMerchantApproval() {
    if (!approvalItem) {
      return;
    }

    try {
      setProcessingId(
        approvalItem.transaction_id
      );

      const token =
        localStorage.getItem(
          "revenue_token"
        );

      if (!token) {
        throw new Error(
          "Authentication token not found."
        );
      }

      const response =
        await fetch(
          "http://localhost:5000/api/recovery/merchant-approve",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },

            body: JSON.stringify({
              transactionId:
                approvalItem.transaction_id,

              action:
                approvalItem.recommended_action ||
                approvalItem.action ||
                "SMART_RETRY",

              reason:
                "Merchant approved recovery after reviewing the AI recommendation.",
            }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
            "Merchant approval failed"
        );
      }

      if (result.success === false) {
        throw new Error(
          result.message ||
            "Recovery was not executed."
        );
      }

      // Show success state first
      setApprovalSubmitted(true);

      alert(
        `Merchant approval successful!\n\n` +
        `Recovered Revenue: ${money(
          result.recoveredAmount
        )}`
      );

      // Close modal
      setApprovalItem(null);
      setApprovalSubmitted(false);

      // Refresh dashboard
      await loadRecoveryData();
    } catch (error) {
      console.error(
        "Merchant approval error:",
        error
      );

      alert(error.message);
    } finally {
      setProcessingId(null);
    }
  }

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <div className="loading">
        Loading recovery dashboard...
      </div>
    );
  }

  return (
    <div className="recovery-page">

      {/* ======================================
          HEADER
      ====================================== */}

      <div className="page-head recovery-page-header">

        <div>

          <span className="recovery-eyebrow">
            AI REVENUE RECOVERY
          </span>

          <h1>
            Revenue Recovery
          </h1>

          <p>
            Turn failed payments into measurable
            recovered revenue using AI-driven,
            policy-controlled decisions.
          </p>

        </div>

        <div className="recovery-status">

          <span className="status-dot"></span>

          AI Recovery Engine Active

        </div>

      </div>


      {/* ======================================
          KPI CARDS
      ====================================== */}

      <div className="recovery-kpi-grid">

        <div className="recovery-kpi">

          <span>
            Revenue At Risk
          </span>

          <strong>
            {money(revenueAtRisk)}
          </strong>

          <small>
            Currently failed revenue
          </small>

        </div>


        <div className="recovery-kpi">

          <span>
            Potential Recovery
          </span>

          <strong>
            {money(potentialRecovery)}
          </strong>

          <small>
            Based on AI probability
          </small>

        </div>


        <div className="recovery-kpi">

          <span>
            Recovery Opportunities
          </span>

          <strong>
            {opportunities.length}
          </strong>

          <small>
            Awaiting recovery decision
          </small>

        </div>


        <div className="recovery-kpi">

          <span>
            Recovered Revenue
          </span>

          <strong>
            {money(recoveredRevenue)}
          </strong>

          <small>
            Successfully recovered
          </small>

        </div>

      </div>


      {/* ======================================
          ACTIVE OPPORTUNITIES
      ====================================== */}

      <div className="recovery-section-header">

        <div>

          <span className="recovery-eyebrow">
            ACTIVE OPPORTUNITIES
          </span>

          <h2>
            Recovery Queue
          </h2>

          <p>
            AI-ranked failed payments that may
            be recoverable.
          </p>

        </div>

        <div className="queue-count">
          {opportunities.length} active
        </div>

      </div>


      {opportunities.length === 0 ? (

        <div className="recovery-empty">

          <div className="empty-icon">
            ✓
          </div>

          <h3>
            No active recovery opportunities
          </h3>

          <p>
            All current recovery opportunities
            have been processed or require no action.
          </p>

        </div>

      ) : (

        <div className="recovery-opportunity-grid">

          {opportunities.map((item) => {

            const probability =
              getProbability(item);

            const isEscalated =
              probability < 60;

            return (

              <div
                className="recovery-opportunity-card"
                key={item.id}
              >

                {/* CARD HEADER */}

                <div className="opportunity-header">

                  <div className="opportunity-customer">

                    <div className="customer-avatar">
                      {item.customer_name
                        ?.charAt(0)
                        ?.toUpperCase()}
                    </div>

                    <div>

                      <strong>
                        {item.customer_name}
                      </strong>

                      <span>
                        {item.customer_segment ||
                          item.segment ||
                          "Customer"}
                      </span>

                    </div>

                  </div>


                  <span
                    className={
                      `priority-badge ${
                        item.priority?.toLowerCase() ||
                        "medium"
                      }`
                    }
                  >
                    {item.priority ||
                      "MEDIUM"}
                  </span>

                </div>


                {/* AMOUNT */}

                <div className="opportunity-amount">

                  <span>
                    Failed Payment
                  </span>

                  <strong>
                    {money(item.amount)}
                  </strong>

                </div>


                {/* PROBABILITY */}

                <div className="probability-section">

                  <div className="probability-header">

                    <span>
                      Recovery Probability
                    </span>

                    <strong>
                      {probability}%
                    </strong>

                  </div>

                  <div className="probability-track">

                    <div
                      className="probability-fill"
                      style={{
                        width: `${Math.min(
                          probability,
                          100
                        )}%`,
                      }}
                    />

                  </div>

                </div>


                {/* DETAILS */}

                <div className="opportunity-details">

                  <div>

                    <span>
                      Failure Reason
                    </span>

                    <strong>
                      {item.failure_reason ||
                        "Payment Failure"}
                    </strong>

                  </div>


                  <div>

                    <span>
                      Recommended Action
                    </span>

                    <strong>
                      {getAction(item)}
                    </strong>

                  </div>


                  <div>

                    <span>
                      Attempts
                    </span>

                    <strong>
                      {item.attempt_count ?? 0}
                    </strong>

                  </div>


                  <div>

                    <span>
                      Customer Success Rate
                    </span>

                    <strong>
                      {item.customer_success_rate ??
                        item.success_rate ??
                        0}%
                    </strong>

                  </div>

                </div>


                {/* WHY */}

                <div className="opportunity-reason">

                  <span>
                    Why this decision?
                  </span>

                  <p>
                    {item.reason ||
                      "The recovery engine selected this action based on payment risk and recovery probability."}
                  </p>

                </div>


                {/* GUARDRAIL */}

                <div
                  className={
                    `opportunity-guardrail ${
                      isEscalated
                        ? "escalated"
                        : "allowed"
                    }`
                  }
                >

                  <div className="guardrail-icon">
                    {isEscalated
                      ? "!"
                      : "✓"}
                  </div>

                  <div>

                    <strong>
                      {isEscalated
                        ? "Merchant Approval Required"
                        : "Eligible for Recovery"}
                    </strong>

                    <span>
                      {isEscalated
                        ? "Probability is below the 60% automatic execution threshold."
                        : "Recovery passed the minimum probability guardrail."}
                    </span>

                  </div>

                </div>


                {/* ACTIONS */}

                <div className="opportunity-actions">

                  {/* VIEW DECISION */}

                  <button
                    className="secondary-action-button"
                    onClick={() =>
                      setSelected(item)
                    }
                  >
                    View Decision
                  </button>


                  {/* REQUEST APPROVAL */}

                  {isEscalated ? (

                    <button
                      className="primary-action-button"
                      disabled={
                        processingId ===
                        item.transaction_id
                      }
                      onClick={() =>
                        setApprovalItem(item)
                      }
                    >
                      Request Approval
                    </button>

                  ) : (

                    <button
                      className="primary-action-button"
                      disabled={
                        processingId ===
                        item.transaction_id
                      }
                      onClick={() =>
                        handleRecovery(item)
                      }
                    >
                      {processingId ===
                      item.transaction_id
                        ? "Processing..."
                        : "Approve & Recover"}
                    </button>

                  )}

                </div>

              </div>

            );
          })}

        </div>

      )}


      {/* ======================================
          RECENTLY RECOVERED
      ====================================== */}

      <div className="recovery-section-header recovered-section-header">

        <div>

          <span className="recovery-eyebrow">
            RECOVERY HISTORY
          </span>

          <h2>
            Recently Recovered
          </h2>

          <p>
            Transactions successfully recovered
            through the recovery engine.
          </p>

        </div>

        <div className="recovered-total">
          {money(recoveredRevenue)} recovered
        </div>

      </div>


      {recovered.length === 0 ? (

        <div className="recovery-empty compact">

          <h3>
            No recovered transactions yet
          </h3>

          <p>
            Successfully executed recoveries will
            appear here.
          </p>

        </div>

      ) : (

        <div className="recovered-list">

          {recovered.map((item) => {

            const probability =
              getProbability(item);

            return (

              <div
                className="recovered-card"
                key={item.transaction_id}
              >

                <div className="recovered-customer">

                  <div className="customer-avatar">

                    {item.customer_name
                      ?.charAt(0)
                      ?.toUpperCase()}

                  </div>

                  <div>

                    <strong>
                      {item.customer_name}
                    </strong>

                    <span>
                      Transaction #
                      {item.transaction_id}
                    </span>

                  </div>

                </div>


                <div className="recovered-metric">

                  <span>
                    Original Amount
                  </span>

                  <strong>
                    {money(item.amount)}
                  </strong>

                </div>


                <div className="recovered-metric">

                  <span>
                    AI Probability
                  </span>

                  <strong>
                    {probability}%
                  </strong>

                </div>


                <div className="recovered-metric">

                  <span>
                    Action
                  </span>

                  <strong>
                    {getAction(item)}
                  </strong>

                </div>


                <div className="recovered-result">

                  <span>
                    Recovered
                  </span>

                  <strong>
                    {money(
                      item.recovered_amount
                    )}
                  </strong>

                  <small>
                    ✓ Executed
                  </small>

                </div>


                <button
                  className="view-outcome-button"
                  onClick={() =>
                    setSelected({
                      ...item,
                      recovered: true,
                    })
                  }
                >
                  View Outcome →
                </button>

              </div>

            );
          })}

        </div>

      )}


      {/* ======================================
          RECOVERY DECISION / OUTCOME MODAL
      ====================================== */}

      {selected && (

        <div
          className="recovery-modal-overlay"
          onClick={() =>
            setSelected(null)
          }
        >

          <div
            className="recovery-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="recovery-modal-header">

              <div>

                <span className="recovery-eyebrow">

                  {selected.recovered
                    ? "RECOVERY OUTCOME"
                    : "EXPLAINABLE AI"}

                </span>

                <h2>

                  {selected.recovered
                    ? "Recovery Outcome"
                    : "Recovery Decision"}

                </h2>

              </div>

              <button
                className="modal-close"
                onClick={() =>
                  setSelected(null)
                }
              >
                ×
              </button>

            </div>


            {/* CUSTOMER */}

            <div className="modal-customer">

              <div className="customer-avatar large">

                {selected.customer_name
                  ?.charAt(0)
                  ?.toUpperCase()}

              </div>

              <div>

                <strong>
                  {selected.customer_name}
                </strong>

                <span>
                  {selected.customer_email ||
                    selected.email ||
                    "Customer"}
                </span>

              </div>

            </div>


            {/* OUTCOME */}

            {selected.recovered ? (

              <>

                <div className="outcome-success">

                  <div className="outcome-check">
                    ✓
                  </div>

                  <div>

                    <span>
                      Successfully Recovered
                    </span>

                    <strong>
                      {money(
                        selected.recovered_amount
                      )}
                    </strong>

                  </div>

                </div>


                <div className="outcome-grid">

                  <div>

                    <span>
                      Original Amount
                    </span>

                    <strong>
                      {money(
                        selected.amount
                      )}
                    </strong>

                  </div>


                  <div>

                    <span>
                      AI Probability
                    </span>

                    <strong>
                      {getProbability(
                        selected
                      )}%
                    </strong>

                  </div>


                  <div>

                    <span>
                      Recovery Action
                    </span>

                    <strong>
                      {getAction(
                        selected
                      )}
                    </strong>

                  </div>


                  <div>

                    <span>
                      Payment Method
                    </span>

                    <strong>
                      {selected.payment_method ||
                        "N/A"}
                    </strong>

                  </div>

                </div>


                <div className="outcome-flow">

                  <div className="flow-step">
                    <b>01</b>
                    <span>Failed</span>
                  </div>

                  <div className="flow-arrow">
                    →
                  </div>

                  <div className="flow-step">
                    <b>02</b>
                    <span>AI Analyzed</span>
                  </div>

                  <div className="flow-arrow">
                    →
                  </div>

                  <div className="flow-step">
                    <b>03</b>
                    <span>Guardrail</span>
                  </div>

                  <div className="flow-arrow">
                    →
                  </div>

                  <div className="flow-step success">
                    <b>04</b>
                    <span>Recovered</span>
                  </div>

                </div>


                {selected.reason && (

                  <div className="outcome-reason">

                    <span>
                      Decision Reason
                    </span>

                    <p>
                      {selected.reason}
                    </p>

                  </div>

                )}

              </>

            ) : (

              <>

                <div className="decision-probability">

                  <span>
                    Recovery Probability
                  </span>

                  <strong>
                    {getProbability(
                      selected
                    )}%
                  </strong>

                </div>


                <div className="outcome-grid">

                  <div>

                    <span>
                      Amount
                    </span>

                    <strong>
                      {money(
                        selected.amount
                      )}
                    </strong>

                  </div>


                  <div>

                    <span>
                      Failure Reason
                    </span>

                    <strong>
                      {selected.failure_reason ||
                        "Payment Failure"}
                    </strong>

                  </div>


                  <div>

                    <span>
                      Recommended Action
                    </span>

                    <strong>
                      {getAction(
                        selected
                      )}
                    </strong>

                  </div>


                  <div>

                    <span>
                      Attempts
                    </span>

                    <strong>
                      {selected.attempt_count ??
                        0}
                    </strong>

                  </div>

                </div>


                <div className="outcome-reason">

                  <span>
                    Why this decision?
                  </span>

                  <p>
                    {selected.reason ||
                      "The recovery engine selected this recommendation based on transaction risk and customer payment behaviour."}
                  </p>

                </div>


                <div
                  className={
                    `modal-guardrail ${
                      getProbability(
                        selected
                      ) < 60
                        ? "escalated"
                        : "allowed"
                    }`
                  }
                >

                  <strong>

                    {getProbability(
                      selected
                    ) < 60
                      ? "⚠ Merchant Approval Required"
                      : "✓ Recovery Guardrail Passed"}

                  </strong>

                  <span>

                    {getProbability(
                      selected
                    ) < 60
                      ? "Automatic execution is blocked because recovery probability is below 60%."
                      : "The recovery probability meets the minimum 60% execution threshold."}

                  </span>

                </div>


                <button
                  className="primary-action-button full-recovery-button"
                  onClick={() =>
                    setSelected(null)
                  }
                >
                  Close Decision
                </button>

              </>

            )}

          </div>

        </div>

      )}


      {/* ======================================
          MERCHANT APPROVAL MODAL
      ====================================== */}

      {approvalItem && (

        <div
          className="recovery-modal-overlay"
          onClick={() => {
            if (
              processingId !==
              approvalItem.transaction_id
            ) {
              setApprovalItem(null);
              setApprovalSubmitted(false);
            }
          }}
        >

          <div
            className="recovery-modal approval-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            {/* HEADER */}

            <div className="recovery-modal-header">

              <div>

                <span className="recovery-eyebrow">
                  MERCHANT CONTROL
                </span>

                <h2>
                  Merchant Approval
                </h2>

              </div>

              <button
                className="modal-close"
                disabled={
                  processingId ===
                  approvalItem.transaction_id
                }
                onClick={() => {
                  setApprovalItem(null);
                  setApprovalSubmitted(false);
                }}
              >
                ×
              </button>

            </div>


            {/* CUSTOMER */}

            <div className="modal-customer">

              <div className="customer-avatar large">

                {approvalItem.customer_name
                  ?.charAt(0)
                  ?.toUpperCase()}

              </div>

              <div>

                <strong>
                  {approvalItem.customer_name}
                </strong>

                <span>
                  {approvalItem.customer_email ||
                    approvalItem.email ||
                    "Customer"}
                </span>

              </div>

            </div>


            {/* AMOUNT */}

            <div className="approval-amount-box">

              <span>
                Transaction Amount
              </span>

              <strong>
                {money(
                  approvalItem.amount
                )}
              </strong>

            </div>


            {/* DETAILS */}

            <div className="approval-details">

              <div>

                <span>
                  Recovery Probability
                </span>

                <strong>
                  {getProbability(
                    approvalItem
                  )}%
                </strong>

              </div>


              <div>

                <span>
                  Recommended Action
                </span>

                <strong>
                  {getAction(
                    approvalItem
                  )}
                </strong>

              </div>


              <div>

                <span>
                  Failure Reason
                </span>

                <strong>
                  {approvalItem.failure_reason ||
                    "Payment Failure"}
                </strong>

              </div>


              <div>

                <span>
                  Attempts
                </span>

                <strong>
                  {approvalItem.attempt_count ??
                    0}
                </strong>

              </div>

            </div>


            {/* WARNING */}

            <div className="approval-warning">

              <strong>
                ⚠ Merchant review required
              </strong>

              <p>
                Automatic recovery is blocked because
                the recovery probability is below the
                60% execution threshold.
              </p>

            </div>


            {/* WHY APPROVAL */}

            <div className="approval-reason">

              <span>
                Why approval is needed
              </span>

              <p>
                {approvalItem.reason ||
                  "The recovery opportunity does not meet the automatic execution threshold, so merchant review is required before recovery."}
              </p>

            </div>


            {/* POLICY */}

            <div className="approval-policy">

              <div className="approval-policy-icon">
                60%
              </div>

              <div>

                <strong>
                  Automatic Execution Threshold
                </strong>

                <span>
                  Transactions below 60% recovery
                  probability require merchant approval.
                </span>

              </div>

            </div>


            {/* APPROVAL SUCCESS */}

            {approvalSubmitted && (

              <div className="approval-success-box">

                <div className="approval-success-icon">
                  ✓
                </div>

                <div>

                  <strong>
                    Approval Submitted
                  </strong>

                  <p>
                    Merchant approval has been recorded
                    and recovery has been executed.
                  </p>

                </div>

              </div>

            )}


            {/* ACTIONS */}

            <div className="approval-actions">

              <button
                className="approval-cancel-btn"
                disabled={
                  processingId ===
                  approvalItem.transaction_id
                }
                onClick={() => {
                  setApprovalItem(null);
                  setApprovalSubmitted(false);
                }}
              >
                Close
              </button>


              {!approvalSubmitted && (

                <button
                  className="approval-confirm-btn"
                  disabled={
                    processingId ===
                    approvalItem.transaction_id
                  }
                  onClick={
                    handleMerchantApproval
                  }
                >

                  {processingId ===
                  approvalItem.transaction_id
                    ? "Processing..."
                    : "Approve & Recover"}

                </button>

              )}

            </div>

          </div>

        </div>

      )}

    </div>
  );
}