import { pool } from "../config/db.js";

export async function createAuditLog({
  transactionId,
  eventType,
  recoveryProbability = null,
  recommendedAction = null,
  guardrailResult = null,
  executionStatus = null,
  recoveredAmount = 0,
  details = null,
}) {
  try {
    await pool.query(
      `
      INSERT INTO recovery_audit_logs
      (
        transaction_id,
        event_type,
        recovery_probability,
        recommended_action,
        guardrail_result,
        execution_status,
        recovered_amount,
        details
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      `,
      [
        transactionId,
        eventType,
        recoveryProbability,
        recommendedAction,
        guardrailResult,
        executionStatus,
        recoveredAmount,
        details,
      ]
    );

    console.log(
      `Audit log created: ${eventType} for transaction ${transactionId}`
    );
  } catch (error) {
    console.error("Audit log error:", error.message);
  }
}