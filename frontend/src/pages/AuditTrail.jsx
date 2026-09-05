import { useEffect, useState } from "react";

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;

const titleCase = (value = "") =>
  String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

export default function AuditTrail() {
  const [transactions, setTransactions] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadTransactions();
  }, []);

  async function loadTransactions() {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("revenue_token");

      if (!token) {
        throw new Error("Session expired. Please login again.");
      }

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const [recoveredResponse, failedResponse] =
        await Promise.all([
          fetch(
            "http://localhost:5000/api/recovery/recovered-history",
            { headers }
          ),
          fetch(
            "http://localhost:5000/api/recovery/failed",
            { headers }
          ),
        ]);

      const recoveredData = await recoveredResponse.json();
      const failedData = await failedResponse.json();

      if (!recoveredResponse.ok) {
        throw new Error(
          recoveredData.message ||
            "Failed to load recovery history"
        );
      }

      const recovered = Array.isArray(recoveredData)
        ? recoveredData
        : recoveredData.data || [];

      const failed = Array.isArray(failedData)
        ? failedData
        : failedData.data || [];

      const combined = [
        ...recovered.map((item) => ({
          ...item,
          auditStatus: "RECOVERED",
        })),
        ...failed.map((item) => ({
          ...item,
          auditStatus: "ACTIVE",
        })),
      ];

      const unique = Array.from(
        new Map(
          combined.map((item) => [
            item.transaction_id || item.id,
            item,
          ])
        ).values()
      );

      setTransactions(unique);

      if (unique.length > 0) {
        loadAudit(
          unique[0].transaction_id || unique[0].id
        );
      }
    } catch (err) {
      console.error("Audit Trail error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadAudit(transactionId) {
    try {
      setSelectedId(transactionId);
      setLogsLoading(true);

      const token =
        localStorage.getItem("revenue_token");

      const response = await fetch(
        `http://localhost:5000/api/recovery/audit/${transactionId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
            "Failed to load audit trail"
        );
      }

      const auditLogs = Array.isArray(result)
        ? result
        : result.data || result.logs || [];

      setLogs(auditLogs);
    } catch (err) {
      console.error("Audit loading error:", err);
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }

  function selectedTransaction() {
    return transactions.find(
      (item) =>
        Number(item.transaction_id || item.id) ===
        Number(selectedId)
    );
  }

  if (loading) {
    return (
      <>
        <style>{styles}</style>

        <div className="audit-loading">
          <div className="audit-spinner"></div>
          <span>Loading audit trail...</span>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <style>{styles}</style>

        <div className="audit-page">
          <div className="audit-error">
            <div className="audit-error-icon">!</div>

            <h2>Unable to load audit trail</h2>

            <p>{error}</p>

            <button
              className="audit-retry"
              onClick={loadTransactions}
            >
              Retry
            </button>
          </div>
        </div>
      </>
    );
  }

  const selected = selectedTransaction();

  return (
    <>
      <style>{styles}</style>

      <div className="audit-page">

        {/* HEADER */}

        <div className="audit-header">

          <div>
            <div className="audit-overline">
              GOVERNANCE & CONTROL
            </div>

            <h1>Audit Trail</h1>

            <p>
              Complete recovery decision history,
              policy checks and execution events.
            </p>
          </div>

          <button
            className="audit-refresh"
            onClick={loadTransactions}
          >
            ↻ Refresh
          </button>

        </div>


        {/* SUMMARY */}

        <div className="audit-summary">

          <div className="audit-summary-card">

            <span className="audit-summary-label">
              TRANSACTIONS
            </span>

            <strong>
              {transactions.length}
            </strong>

            <span>
              Tracked recovery cases
            </span>

          </div>


          <div className="audit-summary-card">

            <span className="audit-summary-label">
              EVENTS
            </span>

            <strong>
              {logs.length}
            </strong>

            <span>
              Events for selected transaction
            </span>

          </div>


          <div className="audit-summary-card">

            <span className="audit-summary-label">
              POLICY
            </span>

            <strong>60%</strong>

            <span>
              Minimum recovery probability
            </span>

          </div>


          <div className="audit-summary-card">

            <span className="audit-summary-label">
              STATUS
            </span>

            <strong className="audit-active">
              ACTIVE
            </strong>

            <span>
              Audit logging enabled
            </span>

          </div>

        </div>


        {/* MAIN */}

        <div className="audit-layout">

          {/* TRANSACTION LIST */}

          <div className="audit-card audit-transactions">

            <div className="audit-card-header">

              <div>
                <div className="audit-section-label">
                  RECOVERY CASES
                </div>

                <h2>Transactions</h2>
              </div>

              <span className="audit-count">
                {transactions.length}
              </span>

            </div>


            {transactions.length === 0 ? (

              <div className="audit-empty">
                <div className="audit-empty-icon">
                  ✓
                </div>

                <strong>
                  No transactions available
                </strong>

                <span>
                  Recovery events will appear here.
                </span>
              </div>

            ) : (

              <div className="audit-transaction-list">

                {transactions.map((item) => {

                  const id =
                    item.transaction_id ||
                    item.id;

                  const customer =
                    item.customer_name ||
                    item.name ||
                    "Unknown Customer";

                  const amount =
                    item.amount || 0;

                  const isSelected =
                    Number(selectedId) ===
                    Number(id);

                  return (
                    <button
                      key={id}
                      className={`audit-transaction ${
                        isSelected
                          ? "selected"
                          : ""
                      }`}
                      onClick={() =>
                        loadAudit(id)
                      }
                    >

                      <div className="audit-transaction-top">

                        <strong>
                          TXN #{id}
                        </strong>

                        <span
                          className={
                            item.auditStatus ===
                            "RECOVERED"
                              ? "status-recovered"
                              : "status-active"
                          }
                        >
                          {item.auditStatus ||
                            "ACTIVE"}
                        </span>

                      </div>


                      <div className="audit-transaction-middle">

                        <span>
                          {customer}
                        </span>

                        <strong>
                          {money(amount)}
                        </strong>

                      </div>


                      <div className="audit-transaction-bottom">

                        <span>
                          {titleCase(
                            item.failure_reason ||
                              "Recovery case"
                          )}
                        </span>

                        <span>
                          →
                        </span>

                      </div>

                    </button>
                  );
                })}

              </div>
            )}

          </div>


          {/* AUDIT TIMELINE */}

          <div className="audit-card audit-events">

            <div className="audit-card-header">

              <div>
                <div className="audit-section-label">
                  EVENT HISTORY
                </div>

                <h2>
                  {selected
                    ? `Transaction #${
                        selectedId
                      }`
                    : "Select Transaction"}
                </h2>

                {selected && (
                  <p>
                    {selected.customer_name ||
                      selected.name ||
                      "Customer"}{" "}
                    ·{" "}
                    {money(selected.amount)}
                  </p>
                )}

              </div>

              {selected && (
                <span className="audit-secure">
                  SECURE LOG
                </span>
              )}

            </div>


            {logsLoading ? (

              <div className="audit-event-loading">
                <div className="audit-small-spinner"></div>
                Loading events...
              </div>

            ) : logs.length === 0 ? (

              <div className="audit-empty">
                <div className="audit-empty-icon">
                  i
                </div>

                <strong>
                  No audit events yet
                </strong>

                <span>
                  Events will appear when recovery
                  analysis or execution occurs.
                </span>
              </div>

            ) : (

              <div className="audit-timeline">

                {logs.map((log, index) => {

                  const event =
                    log.event_type ||
                    log.event ||
                    "EVENT";

                  const probability =
                    log.recovery_probability;

                  const decision =
                    log.guardrail_result;

                  const execution =
                    log.execution_status;

                  const timestamp =
                    log.created_at;

                  return (
                    <div
                      className="audit-event"
                      key={
                        log.id ||
                        `${event}-${index}`
                      }
                    >

                      <div className="audit-line">

                        <div className="audit-event-dot">
                          {index ===
                          logs.length - 1
                            ? "●"
                            : "✓"}
                        </div>

                      </div>


                      <div className="audit-event-body">

                        <div className="audit-event-top">

                          <div>

                            <span className="audit-event-type">
                              {titleCase(event)}
                            </span>

                            {timestamp && (
                              <span className="audit-event-time">
                                {new Date(
                                  timestamp
                                ).toLocaleString(
                                  "en-IN",
                                  {
                                    dateStyle:
                                      "medium",
                                    timeStyle:
                                      "short",
                                  }
                                )}
                              </span>
                            )}

                          </div>


                          {decision && (
                            <span
                              className={`audit-decision ${String(
                                decision
                              ).toLowerCase()}`}
                            >
                              {decision}
                            </span>
                          )}

                        </div>


                        <div className="audit-event-details">

                          {probability !==
                            null &&
                            probability !==
                              undefined && (
                              <div className="audit-detail">

                                <span>
                                  AI Probability
                                </span>

                                <strong>
                                  {Number(
                                    probability
                                  )}%
                                </strong>

                              </div>
                            )}


                          {log.recommended_action && (
                            <div className="audit-detail">

                              <span>
                                Recommended Action
                              </span>

                              <strong>
                                {titleCase(
                                  log.recommended_action
                                )}
                              </strong>

                            </div>
                          )}


                          {execution && (
                            <div className="audit-detail">

                              <span>
                                Execution
                              </span>

                              <strong>
                                {titleCase(
                                  execution
                                )}
                              </strong>

                            </div>
                          )}


                          {log.recovered_amount >
                            0 && (
                            <div className="audit-detail">

                              <span>
                                Recovered
                              </span>

                              <strong className="audit-recovered">
                                {money(
                                  log.recovered_amount
                                )}
                              </strong>

                            </div>
                          )}

                        </div>


                        {log.details && (
                          <div className="audit-event-message">
                            {log.details}
                          </div>
                        )}

                      </div>

                    </div>
                  );
                })}

              </div>
            )}

          </div>

        </div>


        {/* FOOTER */}

        <div className="audit-footer">

          <div className="audit-footer-icon">
            ✓
          </div>

          <div>

            <strong>
              Recovery decisions are auditable
            </strong>

            <span>
              Every AI recommendation, guardrail
              decision and execution event is
              recorded for merchant review.
            </span>

          </div>

          <div className="audit-footer-policy">
            MAX RETRIES: 3
            <br />
            MIN PROBABILITY: 60%
          </div>

        </div>

      </div>
    </>
  );
}


/* =====================================================
   AUDIT TRAIL CSS
===================================================== */

const styles = `
* {
  box-sizing: border-box;
}

.audit-page {
  min-height: 100vh;
  padding: 32px 36px 60px;
  background:
    radial-gradient(circle at 85% 0%, rgba(99,102,241,.08), transparent 30%),
    radial-gradient(circle at 0% 30%, rgba(14,165,233,.05), transparent 25%),
    #f7f8fc;
  color: #172033;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

/* ================= HEADER ================= */

.audit-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 28px;
}

.audit-overline,
.audit-section-label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1.6px;
  color: #7b8497;
}

.audit-header h1 {
  margin: 7px 0 7px;
  font-size: 36px;
  line-height: 1.1;
  letter-spacing: -1.5px;
  font-weight: 800;
  color: #111827;
}

.audit-header p {
  margin: 0;
  max-width: 600px;
  color: #737d90;
  font-size: 13px;
  line-height: 1.6;
}

.audit-refresh {
  border: 1px solid #e0e5ed;
  background: rgba(255,255,255,.9);
  color: #273248;
  border-radius: 11px;
  padding: 11px 17px;
  font-size: 12px;
  font-weight: 750;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(15,23,42,.05);
  transition: all .2s ease;
}

.audit-refresh:hover {
  transform: translateY(-2px);
  border-color: #cdd5e1;
  box-shadow: 0 8px 22px rgba(15,23,42,.08);
}

/* ================= SUMMARY ================= */

.audit-summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 15px;
  margin-bottom: 20px;
}

.audit-summary-card {
  position: relative;
  overflow: hidden;
  min-height: 130px;
  padding: 19px 20px;
  border: 1px solid #e4e8ef;
  border-radius: 16px;
  background: rgba(255,255,255,.92);
  box-shadow:
    0 5px 18px rgba(15,23,42,.035),
    inset 0 1px 0 rgba(255,255,255,.8);
  transition: all .2s ease;
}

.audit-summary-card::after {
  content: "";
  position: absolute;
  width: 70px;
  height: 70px;
  right: -28px;
  bottom: -30px;
  border-radius: 50%;
  background: #f1f4f8;
}

.audit-summary-card:hover {
  transform: translateY(-2px);
  border-color: #d8dee8;
  box-shadow: 0 10px 28px rgba(15,23,42,.06);
}

.audit-summary-label {
  display: block;
  font-size: 9px;
  font-weight: 850;
  letter-spacing: 1.3px;
  color: #8993a5;
}

.audit-summary-card strong {
  display: block;
  margin-top: 9px;
  font-size: 27px;
  letter-spacing: -.6px;
  color: #172033;
}

.audit-summary-card span:last-child {
  display: block;
  margin-top: 6px;
  font-size: 10px;
  color: #8b94a5;
}

.audit-active {
  color: #16824a !important;
  font-size: 17px !important;
  letter-spacing: .4px !important;
}

/* ================= MAIN LAYOUT ================= */

.audit-layout {
  display: grid;
  grid-template-columns: 370px minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

/* ================= CARD ================= */

.audit-card {
  overflow: hidden;
  border: 1px solid #e1e6ee;
  border-radius: 17px;
  background: rgba(255,255,255,.95);
  box-shadow:
    0 6px 22px rgba(15,23,42,.035),
    0 1px 2px rgba(15,23,42,.025);
}

.audit-card-header {
  padding: 21px 22px;
  border-bottom: 1px solid #edf0f4;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  background: linear-gradient(
    180deg,
    rgba(255,255,255,1),
    rgba(250,251,253,.85)
  );
}

.audit-card-header h2 {
  margin: 6px 0 3px;
  font-size: 18px;
  letter-spacing: -.3px;
  font-weight: 780;
  color: #182235;
}

.audit-card-header p {
  margin: 0;
  font-size: 10px;
  color: #8993a5;
}

.audit-count {
  min-width: 30px;
  text-align: center;
  background: #f1f4f8;
  border: 1px solid #e5e9ef;
  border-radius: 20px;
  padding: 6px 10px;
  font-size: 10px;
  font-weight: 850;
  color: #667187;
}

.audit-secure {
  margin-top: 2px;
  font-size: 8px;
  font-weight: 900;
  letter-spacing: 1px;
  background: #ecf9f1;
  border: 1px solid #d6f0df;
  color: #16824a;
  padding: 7px 10px;
  border-radius: 20px;
}

/* ================= TRANSACTION LIST ================= */

.audit-transaction-list {
  padding: 10px;
  max-height: 650px;
  overflow-y: auto;
}

.audit-transaction-list::-webkit-scrollbar {
  width: 5px;
}

.audit-transaction-list::-webkit-scrollbar-thumb {
  background: #d9dee7;
  border-radius: 10px;
}

.audit-transaction {
  position: relative;
  width: 100%;
  border: 1px solid transparent;
  background: transparent;
  text-align: left;
  border-radius: 13px;
  padding: 15px;
  margin-bottom: 7px;
  cursor: pointer;
  transition: all .2s ease;
}

.audit-transaction:hover {
  background: #f8fafc;
  border-color: #e2e7ee;
  transform: translateX(2px);
}

.audit-transaction.selected {
  background:
    linear-gradient(
      135deg,
      #f1f4f8,
      #f8fafc
    );
  border-color: #d3dbe6;
  box-shadow: inset 3px 0 0 #273248;
}

.audit-transaction-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.audit-transaction-top strong {
  font-size: 11px;
  font-weight: 800;
  color: #263147;
}

.audit-transaction-top span {
  font-size: 7px;
  font-weight: 900;
  letter-spacing: .5px;
  padding: 5px 8px;
  border-radius: 20px;
}

.status-recovered {
  background: #ebf8f0;
  color: #16824a;
  border: 1px solid #d5efdf;
}

.status-active {
  background: #fff6e8;
  color: #a16207;
  border: 1px solid #f5e5c7;
}

.audit-transaction-middle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
}

.audit-transaction-middle span {
  font-size: 11px;
  font-weight: 600;
  color: #667187;
}

.audit-transaction-middle strong {
  font-size: 12px;
  color: #1d293d;
}

.audit-transaction-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
  color: #9aa3b2;
  font-size: 9px;
}

.audit-transaction-bottom span:last-child {
  font-size: 14px;
  color: #a0a8b6;
}

/* ================= TIMELINE ================= */

.audit-events {
  min-height: 520px;
}

.audit-timeline {
  padding: 26px 26px 32px;
}

.audit-event {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  min-height: 125px;
  position: relative;
}

.audit-line {
  position: relative;
}

.audit-line::after {
  content: "";
  position: absolute;
  left: 10px;
  top: 25px;
  bottom: -12px;
  width: 1px;
  background: linear-gradient(
    180deg,
    #dce2ea,
    #eef1f5
  );
}

.audit-event:last-child .audit-line::after {
  display: none;
}

.audit-event-dot {
  position: relative;
  z-index: 2;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #f4f6f9;
  border: 1px solid #dbe1e9;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #536177;
  font-size: 8px;
  box-shadow: 0 0 0 4px white;
}

.audit-event-body {
  margin-left: 8px;
  padding-bottom: 28px;
}

.audit-event-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.audit-event-type {
  display: block;
  font-size: 12px;
  font-weight: 800;
  color: #273248;
}

.audit-event-time {
  display: block;
  margin-top: 5px;
  font-size: 9px;
  color: #929baa;
}

.audit-decision {
  white-space: nowrap;
  font-size: 8px;
  font-weight: 900;
  letter-spacing: .5px;
  padding: 6px 9px;
  border-radius: 20px;
}

.audit-decision.allow,
.audit-decision.recovered {
  background: #ebf8f0;
  color: #16824a;
  border: 1px solid #d5efdf;
}

.audit-decision.escalate {
  background: #fff6e8;
  color: #a16207;
  border: 1px solid #f3e3c5;
}

.audit-decision.block,
.audit-decision.stop {
  background: #fff0f0;
  color: #c43b3b;
  border: 1px solid #f4dada;
}

.audit-event-details {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
  margin-top: 14px;
}

.audit-detail {
  position: relative;
  padding: 10px 11px;
  border: 1px solid #edf0f4;
  border-radius: 10px;
  background: #f8f9fb;
  transition: all .2s ease;
}

.audit-detail:hover {
  background: #f5f7fa;
  border-color: #e2e6ec;
}

.audit-detail span {
  display: block;
  font-size: 8px;
  font-weight: 600;
  color: #8993a4;
}

.audit-detail strong {
  display: block;
  margin-top: 5px;
  font-size: 10px;
  font-weight: 750;
  color: #354158;
}

.audit-recovered {
  color: #16824a !important;
}

.audit-event-message {
  margin-top: 11px;
  border: 1px solid #edf0f4;
  border-left: 3px solid #aeb7c5;
  border-radius: 8px;
  background: #fafbfc;
  padding: 11px 12px;
  font-size: 9px;
  line-height: 1.6;
  color: #69758a;
}

/* ================= EMPTY ================= */

.audit-empty {
  min-height: 260px;
  padding: 35px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7px;
  text-align: center;
}

.audit-empty-icon {
  width: 44px;
  height: 44px;
  border-radius: 13px;
  background: #f0f3f7;
  border: 1px solid #e1e6ed;
  color: #59677d;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  margin-bottom: 7px;
}

.audit-empty strong {
  font-size: 12px;
  color: #4b576c;
}

.audit-empty span {
  max-width: 260px;
  font-size: 9px;
  line-height: 1.5;
  color: #929baa;
}

/* ================= LOADING ================= */

.audit-loading {
  min-height: 70vh;
  background: #f7f8fc;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 13px;
  color: #788397;
  font-size: 12px;
}

.audit-spinner,
.audit-small-spinner {
  border-radius: 50%;
  border: 3px solid #e5e9ef;
  border-top-color: #263147;
  animation: audit-spin .75s linear infinite;
}

.audit-spinner {
  width: 34px;
  height: 34px;
}

.audit-small-spinner {
  width: 24px;
  height: 24px;
}

.audit-event-loading {
  min-height: 320px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #7c8799;
  font-size: 11px;
}

@keyframes audit-spin {
  to {
    transform: rotate(360deg);
  }
}

/* ================= ERROR ================= */

.audit-error {
  min-height: 70vh;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  text-align: center;
}

.audit-error-icon {
  width: 52px;
  height: 52px;
  border-radius: 15px;
  background: #fff0f0;
  border: 1px solid #f4dada;
  color: #c43b3b;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  font-size: 18px;
}

.audit-error h2 {
  margin: 17px 0 5px;
  font-size: 20px;
  color: #263147;
}

.audit-error p {
  font-size: 11px;
  color: #8993a4;
}

.audit-retry {
  margin-top: 12px;
  border: none;
  background: #172033;
  color: white;
  border-radius: 9px;
  padding: 10px 17px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: all .2s ease;
}

.audit-retry:hover {
  transform: translateY(-2px);
  box-shadow: 0 7px 18px rgba(23,32,51,.2);
}

/* ================= FOOTER ================= */

.audit-footer {
  margin-top: 20px;
  position: relative;
  overflow: hidden;
  background:
    linear-gradient(
      135deg,
      #141c2d,
      #202a3d
    );
  color: white;
  border-radius: 16px;
  padding: 19px 22px;
  display: flex;
  align-items: center;
  gap: 15px;
  box-shadow: 0 10px 28px rgba(15,23,42,.12);
}

.audit-footer::after {
  content: "";
  position: absolute;
  width: 180px;
  height: 180px;
  right: -80px;
  top: -100px;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,.06);
}

.audit-footer-icon {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 11px;
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.08);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
}

.audit-footer strong {
  display: block;
  font-size: 12px;
  font-weight: 750;
}

.audit-footer span {
  display: block;
  margin-top: 5px;
  max-width: 620px;
  font-size: 9px;
  line-height: 1.5;
  color: rgba(255,255,255,.55);
}

.audit-footer-policy {
  position: relative;
  z-index: 2;
  margin-left: auto;
  text-align: right;
  font-size: 8px;
  line-height: 1.9;
  letter-spacing: .5px;
  color: rgba(255,255,255,.5);
}

/* ================= RESPONSIVE ================= */

@media (max-width: 1100px) {
  .audit-page {
    padding: 28px 24px 50px;
  }

  .audit-summary {
    grid-template-columns: repeat(2, 1fr);
  }

  .audit-layout {
    grid-template-columns: 1fr;
  }

  .audit-transaction-list {
    max-height: 420px;
  }
}

@media (max-width: 650px) {
  .audit-page {
    padding: 22px 15px 40px;
  }

  .audit-header {
    flex-direction: column;
    gap: 16px;
  }

  .audit-header h1 {
    font-size: 30px;
  }

  .audit-summary {
    grid-template-columns: 1fr;
  }

  .audit-event-details {
    grid-template-columns: 1fr;
  }

  .audit-event-top {
    flex-direction: column;
  }

  .audit-footer {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .audit-footer-policy {
    margin-left: 0;
    text-align: left;
  }
}
`;