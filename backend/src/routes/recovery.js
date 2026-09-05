import { Router } from "express";
import { pool } from "../config/db.js";
import { analyzeWithAI } from "../services/aiService.js";
import {
  calculateRecoveryScore,
  recommendAction,
  priorityFromScore,
} from "../services/recoveryEngine.js";
import { evaluateRecoveryPolicy } from "../services/recoveryPolicy.js";
import { createAuditLog } from "../services/auditLogger.js";

const router = Router();

/* =========================================================
   CONSTANTS
========================================================= */

const AI_ACTIONS = new Set([
  "SMART_RETRY",
  "RETRY_LATER",
  "UPDATE_PAYMENT_METHOD",
  "SEND_REMINDER",
  "AUTHENTICATION_RETRY",
]);

const PRIORITIES = new Set(["HIGH", "MEDIUM", "LOW"]);

const ACTION_LABELS = {
  SMART_RETRY: "Smart Retry",
  RETRY_LATER: "Retry Later",
  UPDATE_PAYMENT_METHOD: "Update Payment Method",
  SEND_REMINDER: "Send Reminder",
  AUTHENTICATION_RETRY: "Authentication Retry",
};

const ROOT_CAUSES = {
  bank_declined: {
    label: "Bank Declined",
    explanation: "The customer's bank declined the payment.",
    primary: "SMART_RETRY",
  },

  card_expired: {
    label: "Expired Card",
    explanation: "The payment method may have expired.",
    primary: "UPDATE_PAYMENT_METHOD",
  },

  technical_failure: {
    label: "Technical Failure",
    explanation: "A temporary technical issue interrupted the payment.",
    primary: "SMART_RETRY",
  },

  insufficient_funds: {
    label: "Insufficient Funds",
    explanation: "The payment could not be completed because of insufficient funds.",
    primary: "RETRY_LATER",
  },

  authentication_failure: {
    label: "Authentication Failure",
    explanation: "Additional authentication may be required.",
    primary: "AUTHENTICATION_RETRY",
  },
};


/* =========================================================
   HELPERS
========================================================= */

function getRootCause(reason) {
  return (
    ROOT_CAUSES[reason] || {
      label: reason || "Unknown",
      explanation: "The payment failed for an unspecified reason.",
      primary: "SEND_REMINDER",
    }
  );
}


function getRetryTime(action) {
  const now = new Date();

  if (action === "SMART_RETRY") {
    now.setMinutes(now.getMinutes() + 30);
  } else if (action === "RETRY_LATER") {
    now.setHours(now.getHours() + 6);
  } else if (action === "AUTHENTICATION_RETRY") {
    now.setMinutes(now.getMinutes() + 15);
  } else {
    now.setHours(now.getHours() + 24);
  }

  return now;
}


function getFallbackAction(action, rootCause) {
  if (action === "SMART_RETRY") return "RETRY_LATER";

  if (action === "RETRY_LATER") return "SEND_REMINDER";

  if (action === "AUTHENTICATION_RETRY") return "SEND_REMINDER";

  if (action === "UPDATE_PAYMENT_METHOD") return "SEND_REMINDER";

  if (action === "SEND_REMINDER") {
    return rootCause.primary || "SEND_REMINDER";
  }

  return "SEND_REMINDER";
}


function clampProbability(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(number)));
}


function normalizeAIAction(action, fallback) {
  return AI_ACTIONS.has(action) ? action : fallback;
}


function normalizePriority(priority, fallback) {
  return PRIORITIES.has(priority) ? priority : fallback;
}


function buildDecisionReason(payment, probability, action, policy) {
  if (policy.decision === "BLOCK") {
    return policy.reasons.join(". ");
  }

  if (policy.decision === "ESCALATE") {
    return policy.reasons.join(". ");
  }

  return (
    `AI recommends ${ACTION_LABELS[action] || action} with ` +
    `${probability}% recovery probability based on payment history, ` +
    `failure reason, amount and attempt count.`
  );
}


/* =========================================================
   EXECUTE RECOVERY
========================================================= */

async function executeRecovery({
  transactionId,
  action = null,
  merchantApproved = false,
  approvalReason = null,
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    /* Lock transaction so two recovery operations
       cannot execute at the same time. */
    const transactionResult = await client.query(
      `
      SELECT
        t.*,
        c.name AS customer_name,
        c.email AS customer_email,
        c.segment AS customer_segment,
        c.success_rate AS customer_success_rate,
        c.lifetime_value
      FROM transactions t
      JOIN customers c ON c.id = t.customer_id
      WHERE t.id = $1
      FOR UPDATE
      `,
      [transactionId]
    );

    if (transactionResult.rows.length === 0) {
      throw new Error("Transaction not found.");
    }

    const payment = transactionResult.rows[0];

    /* Get latest AI recovery decision */
    const actionResult = await client.query(
      `
      SELECT *
      FROM recovery_actions
      WHERE transaction_id = $1
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [transactionId]
    );

    const latestAction = actionResult.rows[0];

    const recoveryProbability = latestAction
      ? clampProbability(latestAction.recovery_score)
      : 0;

    const canonicalAction =
      latestAction?.recommended_action ||
      action ||
      "SEND_REMINDER";

    /* Re-check policy immediately before execution.
       This prevents bypassing guardrails. */
    const policy = evaluateRecoveryPolicy(
      payment,
      recoveryProbability,
      canonicalAction
    );

    /* BLOCK can never be executed */
    if (policy.decision === "BLOCK") {
      await client.query("ROLLBACK");

      await createAuditLog({
        transactionId,
        eventType: "RECOVERY_BLOCKED",
        recoveryProbability,
        recommendedAction: canonicalAction,
        guardrailResult: "BLOCK",
        executionStatus: "BLOCKED",
        recoveredAmount: 0,
        details: JSON.stringify({
          reasons: policy.reasons,
          merchantApproved,
        }),
      });

      throw new Error(
        `Recovery blocked by guardrails: ${policy.reasons.join(", ")}`
      );
    }

    /* ESCALATE requires merchant approval */
    if (policy.decision === "ESCALATE" && !merchantApproved) {
      await client.query("ROLLBACK");

      await createAuditLog({
        transactionId,
        eventType: "RECOVERY_ESCALATED",
        recoveryProbability,
        recommendedAction: canonicalAction,
        guardrailResult: "ESCALATE",
        executionStatus: "WAITING_FOR_APPROVAL",
        recoveredAmount: 0,
        details: JSON.stringify({
          reasons: policy.reasons,
        }),
      });

      throw new Error(
        `Merchant approval required: ${policy.reasons.join(", ")}`
      );
    }

    /* =====================================================
       SIMULATED RECOVERY EXECUTION
       ===================================================== */

    const recoveredAmount = Number(payment.amount);

    await client.query(
      `
      UPDATE transactions
      SET
        status = 'recovered',
        recovered_amount = amount
      WHERE id = $1
      `,
      [transactionId]
    );

    await client.query(
      `
      UPDATE recovery_actions
      SET status = 'executed'
      WHERE id = (
        SELECT id
        FROM recovery_actions
        WHERE transaction_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      )
      `,
      [transactionId]
    );

    await client.query("COMMIT");

    const guardrailResult =
      policy.decision === "ESCALATE"
        ? "MERCHANT_APPROVED"
        : "ALLOW";

    await createAuditLog({
      transactionId,
      eventType: "RECOVERY_EXECUTED",
      recoveryProbability,
      recommendedAction: canonicalAction,
      guardrailResult,
      executionStatus: "EXECUTED",
      recoveredAmount,
      details: JSON.stringify({
        policyDecision: policy.decision,
        policyReasons: policy.reasons,
        merchantApproved,
        approvalReason,
        simulated: true,
      }),
    });

    return {
      transactionId,
      action: canonicalAction,
      recoveredAmount,
      recoveryProbability,
      guardrail: policy.decision,
      executionStatus: "EXECUTED",
      message: `₹${recoveredAmount} recovery executed successfully.`,
    };
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {}

    throw error;
  } finally {
    client.release();
  }
}

/* =========================================================
   GET ALL RECOVERY ACTIONS
========================================================= */

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        t.id AS transaction_id,
        t.amount,
        t.payment_method,
        t.status AS transaction_status,
        t.failure_reason,
        t.attempt_count,
        t.recovered_amount,
        t.created_at AS transaction_created_at,

        c.id AS customer_id,
        c.name AS customer_name,
        c.email AS customer_email,
        c.segment AS customer_segment,
        c.success_rate AS customer_success_rate,
        c.lifetime_value,

        ra.id AS recovery_action_id,
        ra.recovery_score,
        ra.priority,
        ra.recommended_action,
        ra.reason,
        ra.personalized_message,
        ra.status AS recovery_status,
        ra.fallback_action,
        ra.root_cause,
        ra.retry_at,
        ra.autopilot_decision,
        ra.created_at AS recovery_created_at

      FROM transactions t

      JOIN customers c
        ON c.id = t.customer_id

      LEFT JOIN LATERAL (
        SELECT *
        FROM recovery_actions
        WHERE transaction_id = t.id
        ORDER BY created_at DESC
        LIMIT 1
      ) ra ON true

      WHERE t.status = 'failed'

      ORDER BY
        COALESCE(ra.recovery_score, 0) DESC,
        t.created_at DESC
      `
    );

    res.json(result.rows);

  } catch (error) {
    console.error("Recovery GET error:", error);

    res.status(500).json({
      message: "Failed to fetch recovery opportunities.",
      error: error.message,
    });
  }
});

/* =========================================================
   GET FAILED PAYMENTS
========================================================= */

router.get("/failed", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        t.id,
        t.amount,
        t.payment_method,
        t.status,
        t.failure_reason,
        t.attempt_count,
        t.recovered_amount,
        t.created_at,

        c.id AS customer_id,
        c.name AS customer_name,
        c.email AS customer_email,
        c.segment AS customer_segment,
        c.lifetime_value,
        c.success_rate AS customer_success_rate

      FROM transactions t
      JOIN customers c ON c.id = t.customer_id
      WHERE t.status = 'failed'
      ORDER BY t.created_at DESC
      `
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Failed payments error:", error);

    res.status(500).json({
      message: "Failed to fetch failed payments.",
    });
  }
});


/* =========================================================
   GET AI INSIGHTS FOR ONE TRANSACTION
========================================================= */

router.get("/insights/:transactionId", async (req, res) => {
  try {
    const { transactionId } = req.params;

    const result = await pool.query(
      `
      SELECT
        ra.*,
        t.amount,
        t.payment_method,
        t.status AS transaction_status,
        t.failure_reason,
        t.attempt_count,

        c.name AS customer_name,
        c.email AS customer_email,
        c.segment AS customer_segment,
        c.lifetime_value,
        c.success_rate AS customer_success_rate

      FROM recovery_actions ra
      JOIN transactions t ON t.id = ra.transaction_id
      JOIN customers c ON c.id = t.customer_id

      WHERE ra.transaction_id = $1
      ORDER BY ra.created_at DESC
      LIMIT 1
      `,
      [transactionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "No recovery analysis found.",
      });
    }

    const row = result.rows[0];

    const rootCause = getRootCause(row.failure_reason);

    res.json({
      ...row,

      recovery_probability: Number(row.recovery_score),

      action_label:
        ACTION_LABELS[row.recommended_action] ||
        row.recommended_action,

      root_cause: rootCause.label,
      root_cause_explanation: rootCause.explanation,

      decision_strategy: row.recommended_action,

      fallback_action:
        row.fallback_action ||
        getFallbackAction(row.recommended_action, rootCause),

      retry_at:
        row.retry_at ||
        getRetryTime(row.recommended_action),
    });
  } catch (error) {
    console.error("Insights error:", error);

    res.status(500).json({
      message: "Failed to fetch recovery insights.",
    });
  }
});


/* =========================================================
   ANALYZE PAYMENT WITH AI
========================================================= */

router.post("/analyze", async (req, res) => {
  try {
    const { transactionId } = req.body;

    if (!transactionId) {
      return res.status(400).json({
        message: "transactionId is required.",
      });
    }

    const result = await pool.query(
      `
      SELECT
        t.id,
        t.customer_id,
        t.amount,
        t.payment_method,
        t.status,
        t.failure_reason,
        t.attempt_count,
        t.recovered_amount,
        t.created_at,

        c.name AS customer_name,
        c.email AS customer_email,
        c.segment,
        c.segment AS customer_segment,
        c.lifetime_value,
        c.success_rate AS customer_success_rate

      FROM transactions t
      JOIN customers c ON c.id = t.customer_id
      WHERE t.id = $1
      `,
      [transactionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Transaction not found.",
      });
    }

    const payment = result.rows[0];

    /* =====================================================
       STEP 1: DETERMINISTIC BASELINE
    ===================================================== */

    const deterministicScore = calculateRecoveryScore(payment);

    const deterministicAction = recommendAction(
      payment,
      deterministicScore
    );

    const deterministicPriority =
      priorityFromScore(deterministicScore);


    /* =====================================================
       STEP 2: AI ANALYSIS
    ===================================================== */

    const aiDecision = await analyzeWithAI(
      payment,
      deterministicScore,
      deterministicAction,
      deterministicPriority
    );


    /* =====================================================
       STEP 3: NORMALIZE AI DECISION
    ===================================================== */

    const recoveryProbability = clampProbability(
      aiDecision.recovery_probability
    );

    const recommendedAction = normalizeAIAction(
      aiDecision.recommended_action,
      deterministicAction
    );

    const priority = normalizePriority(
      aiDecision.priority,
      priorityFromScore(recoveryProbability)
    );

    const rootCause = getRootCause(
      payment.failure_reason
    );


    /* =====================================================
       STEP 4: GUARDRAIL
    ===================================================== */

    const policy = evaluateRecoveryPolicy(
      payment,
      recoveryProbability,
      recommendedAction
    );

    const reason =
      policy.decision === "ALLOW"
        ? aiDecision.reason
        : buildDecisionReason(
            payment,
            recoveryProbability,
            recommendedAction,
            policy
          );

    const personalizedMessage =
      aiDecision.personalized_message ||
      `Your payment of ₹${payment.amount} could not be completed. Please try again.`;


    /* =====================================================
       STEP 5: ADDITIONAL INTELLIGENCE
    ===================================================== */

    const fallbackAction = getFallbackAction(
      recommendedAction,
      rootCause
    );

    const retryAt = getRetryTime(
      recommendedAction
    );


    /* =====================================================
       STEP 6: SAVE AI DECISION
    ===================================================== */

    const insertResult = await pool.query(
      `
      INSERT INTO recovery_actions
      (
        transaction_id,
        recovery_score,
        priority,
        recommended_action,
        reason,
        personalized_message,
        status,
        fallback_action,
        root_cause,
        retry_at,
        autopilot_decision
      )
      VALUES
      (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11
      )
      RETURNING *
      `,
      [
        transactionId,
        recoveryProbability,
        priority,
        recommendedAction,
        reason,
        personalizedMessage,
        policy.decision === "BLOCK"
          ? "blocked"
          : policy.decision === "ESCALATE"
          ? "escalated"
          : "recommended",
        fallbackAction,
        rootCause.label,
        retryAt,
        policy.decision,
      ]
    );

    const savedAction = insertResult.rows[0];


    /* =====================================================
       STEP 7: AUDIT AI DECISION
    ===================================================== */

    await createAuditLog({
      transactionId,
      eventType: "RECOVERY_ANALYZED",
      recoveryProbability,
      recommendedAction,
      guardrailResult: policy.decision,
      executionStatus: "RECOMMENDED",
      recoveredAmount: 0,

      details: JSON.stringify({
        aiGenerated: aiDecision.ai_generated ?? true,

        deterministicBaseline: {
          score: deterministicScore,
          action: deterministicAction,
          priority: deterministicPriority,
        },

        aiDecision: {
          recoveryProbability,
          priority,
          recommendedAction,
          reason: aiDecision.reason,
        },

        guardrail: {
          decision: policy.decision,
          reasons: policy.reasons,
          minimumProbability:
            policy.minimumProbability,
          maxRetries: policy.maxRetries,
          highValueThreshold:
            policy.highValueThreshold,
        },
      }),
    });


    /* =====================================================
       RESPONSE
    ===================================================== */

    res.json({
      success: true,

      transaction: payment,

      analysis: {
        deterministicScore,
        deterministicAction,
        deterministicPriority,

        recovery_probability: recoveryProbability,
        priority,
        recommended_action: recommendedAction,

        action_label:
          ACTION_LABELS[recommendedAction] ||
          recommendedAction,

        reason,
        personalized_message:
          personalizedMessage,

        ai_generated:
          aiDecision.ai_generated ?? true,
      },

      rootCause: {
        label: rootCause.label,
        explanation: rootCause.explanation,
        defaultStrategy: rootCause.primary,
      },

      intelligence: {
        decisionStrategy: recommendedAction,
        fallbackAction,
        retryAt,
      },

      policy: {
        decision: policy.decision,
        allowed: policy.allowed,
        reasons: policy.reasons,
        minimumProbability:
          policy.minimumProbability,
        maxRetries: policy.maxRetries,
        highValueThreshold:
          policy.highValueThreshold,
      },

      recoveryAction: savedAction,
    });
  } catch (error) {
    console.error("AI Analyze error:", error);

    res.status(500).json({
      message: "Failed to analyze payment.",
      error: error.message,
    });
  }
});


/* =========================================================
   APPROVE NORMAL ALLOWED RECOVERY
========================================================= */

router.post("/approve", async (req, res) => {
  try {
    const { transactionId } = req.body;

    if (!transactionId) {
      return res.status(400).json({
        message: "transactionId is required.",
      });
    }

    const actionResult = await pool.query(
      `
      SELECT *
      FROM recovery_actions
      WHERE transaction_id = $1
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [transactionId]
    );

    if (actionResult.rows.length === 0) {
      return res.status(404).json({
        message: "Please analyze the payment before approving.",
      });
    }

    const action = actionResult.rows[0];

    if (action.autopilot_decision === "BLOCK") {
      return res.status(403).json({
        message:
          "This recovery is blocked by the guardrail policy.",
      });
    }

    if (action.autopilot_decision === "ESCALATE") {
      return res.status(403).json({
        message:
          "This recovery requires merchant approval.",
      });
    }

    const result = await executeRecovery({
      transactionId,
      action: action.recommended_action,
      merchantApproved: false,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Approve recovery error:", error);

    res.status(400).json({
      message: error.message,
    });
  }
});


/* =========================================================
   MERCHANT APPROVAL
========================================================= */

router.post("/merchant-approve", async (req, res) => {
  try {
    const {
      transactionId,
      approvalReason = "Merchant approved recovery.",
    } = req.body;

    if (!transactionId) {
      return res.status(400).json({
        message: "transactionId is required.",
      });
    }

    const actionResult = await pool.query(
      `
      SELECT *
      FROM recovery_actions
      WHERE transaction_id = $1
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [transactionId]
    );

    if (actionResult.rows.length === 0) {
      return res.status(404).json({
        message: "No recovery decision found.",
      });
    }

    const action = actionResult.rows[0];

    if (action.autopilot_decision === "BLOCK") {
      return res.status(403).json({
        message:
          "Blocked recovery cannot be approved.",
      });
    }

    const result = await executeRecovery({
      transactionId,
      action: action.recommended_action,
      merchantApproved: true,
      approvalReason,
    });

    res.json({
      success: true,
      merchantApproved: true,
      ...result,
    });
  } catch (error) {
    console.error("Merchant approval error:", error);

    res.status(400).json({
      message: error.message,
    });
  }
});


/* =========================================================
   AUTOPILOT
========================================================= */

router.post("/autopilot", async (req, res) => {
  try {
    /* Get only the latest recovery decision
       for each transaction. */
    const result = await pool.query(
      `
      SELECT DISTINCT ON (ra.transaction_id)
        ra.*,

        t.amount,
        t.payment_method,
        t.status AS transaction_status,
        t.failure_reason,
        t.attempt_count,

        c.name AS customer_name,
        c.segment AS customer_segment,
        c.success_rate AS customer_success_rate

      FROM recovery_actions ra

      JOIN transactions t
        ON t.id = ra.transaction_id

      JOIN customers c
        ON c.id = t.customer_id

      WHERE t.status = 'failed'

      ORDER BY
        ra.transaction_id,
        ra.created_at DESC
      `
    );

    const candidates = result.rows;

    const summary = {
      total: candidates.length,
      allowed: 0,
      escalated: 0,
      blocked: 0,
      executed: 0,
      recoveredAmount: 0,
    };

    const results = [];

    for (const candidate of candidates) {
      const payment = {
        id: candidate.transaction_id,
        amount: candidate.amount,
        status: candidate.transaction_status,
        failure_reason: candidate.failure_reason,
        attempt_count: candidate.attempt_count,
      };

      const probability = clampProbability(
        candidate.recovery_score
      );

      const action = candidate.recommended_action;

      const policy = evaluateRecoveryPolicy(
        payment,
        probability,
        action
      );

      /* ===================================================
         BLOCK
      =================================================== */

      if (policy.decision === "BLOCK") {
        summary.blocked++;

        await pool.query(
          `
          UPDATE recovery_actions
          SET status = 'blocked',
              autopilot_decision = 'BLOCK'
          WHERE id = $1
          `,
          [candidate.id]
        );

        await createAuditLog({
          transactionId: candidate.transaction_id,
          eventType: "AUTOPILOT_BLOCKED",
          recoveryProbability: probability,
          recommendedAction: action,
          guardrailResult: "BLOCK",
          executionStatus: "BLOCKED",
          recoveredAmount: 0,
          details: JSON.stringify({
            reasons: policy.reasons,
          }),
        });

        results.push({
          transactionId: candidate.transaction_id,
          decision: "BLOCK",
          action,
          recoveryProbability: probability,
          reasons: policy.reasons,
        });

        continue;
      }


      /* ===================================================
         ESCALATE
      =================================================== */

      if (policy.decision === "ESCALATE") {
        summary.escalated++;

        await pool.query(
          `
          UPDATE recovery_actions
          SET status = 'escalated',
              autopilot_decision = 'ESCALATE'
          WHERE id = $1
          `,
          [candidate.id]
        );

        await createAuditLog({
          transactionId: candidate.transaction_id,
          eventType: "AUTOPILOT_ESCALATED",
          recoveryProbability: probability,
          recommendedAction: action,
          guardrailResult: "ESCALATE",
          executionStatus: "WAITING_FOR_APPROVAL",
          recoveredAmount: 0,
          details: JSON.stringify({
            reasons: policy.reasons,
          }),
        });

        results.push({
          transactionId: candidate.transaction_id,
          decision: "ESCALATE",
          action,
          recoveryProbability: probability,
          reasons: policy.reasons,
        });

        continue;
      }


      /* ===================================================
         ALLOW
      =================================================== */

      summary.allowed++;

      try {
        const execution = await executeRecovery({
          transactionId: candidate.transaction_id,
          action,
          merchantApproved: false,
        });

        summary.executed++;
        summary.recoveredAmount += Number(
          execution.recoveredAmount || 0
        );

        results.push({
          transactionId: candidate.transaction_id,
          decision: "ALLOW",
          action,
          recoveryProbability: probability,
          executionStatus: "EXECUTED",
          recoveredAmount:
            execution.recoveredAmount,
        });
      } catch (executionError) {
        results.push({
          transactionId: candidate.transaction_id,
          decision: "ALLOW",
          action,
          recoveryProbability: probability,
          executionStatus: "FAILED",
          error: executionError.message,
        });
      }
    }

    res.json({
      success: true,
      summary,
      results,
    });
  } catch (error) {
    console.error("Autopilot error:", error);

    res.status(500).json({
      message: "Autopilot execution failed.",
      error: error.message,
    });
  }
});


/* =========================================================
   AUDIT TRAIL
========================================================= */

router.get("/audit/:transactionId", async (req, res) => {
  try {
    const { transactionId } = req.params;

    const result = await pool.query(
      `
      SELECT *
      FROM recovery_audit_logs
      WHERE transaction_id = $1
      ORDER BY created_at DESC
      `,
      [transactionId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Audit trail error:", error);

    res.status(500).json({
      message: "Failed to fetch audit trail.",
    });
  }
});


/* =========================================================
   RECOVERED HISTORY
========================================================= */

router.get("/recovered-history", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        t.id,
        t.amount,
        t.payment_method,
        t.status,
        t.recovered_amount,
        t.failure_reason,
        t.attempt_count,
        t.created_at,

        c.name AS customer_name,
        c.email AS customer_email,
        c.segment AS customer_segment,

        ra.recovery_score,
        ra.priority,
        ra.recommended_action,
        ra.reason,
        ra.created_at AS recovery_created_at

      FROM transactions t

      JOIN customers c
        ON c.id = t.customer_id

      LEFT JOIN LATERAL (
        SELECT *
        FROM recovery_actions
        WHERE transaction_id = t.id
        ORDER BY created_at DESC
        LIMIT 1
      ) ra ON true

      WHERE t.status = 'recovered'

      ORDER BY t.created_at DESC
      `
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Recovered history error:", error);

    res.status(500).json({
      message: "Failed to fetch recovered history.",
    });
  }
});


export default router;