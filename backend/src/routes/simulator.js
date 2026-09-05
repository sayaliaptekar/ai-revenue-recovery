import express from "express";
import { pool } from "../config/db.js";
import {
  calculateRecoveryScore,
  recommendAction,
  priorityFromScore,
} from "../services/recoveryEngine.js";
import { evaluateRecoveryPolicy } from "../services/recoveryPolicy.js";

const router = express.Router();

const MAX_SIMULATION_PAYMENTS = 500;
const MAX_RETRY_ATTEMPTS = 3;
const MIN_RECOVERY_PROBABILITY = 60;
const HIGH_VALUE_THRESHOLD = 20000;

// Baseline = what merchant could recover without our AI system
const BASELINE_RECOVERY_RATE = 55;

/* =====================================================
   STRATEGY DEFINITIONS
===================================================== */

const STRATEGIES = [
  {
    id: "smart_retry",
    name: "Smart Retry",
    bonus: 8,
    cap: 96,
  },
  {
    id: "personalized_messaging",
    name: "Personalized Messaging",
    bonus: 5,
    cap: 92,
  },
  {
    id: "alternate_payment",
    name: "Alternate Payment",
    bonus: 4,
    cap: 90,
  },
  {
    id: "ai_adaptive",
    name: "AI Adaptive",
    bonus: 12,
    cap: 98,
  },
];

/* =====================================================
   NORMALIZE STRATEGY
===================================================== */

function normalizeStrategy(value) {
  const name = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

  const aliases = {
    smart_retry: "smart_retry",

    personalized_messaging: "personalized_messaging",
    personalized_message: "personalized_messaging",

    alternate_payment: "alternate_payment",
    alternate_payment_method: "alternate_payment",

    ai_adaptive: "ai_adaptive",
    ai_adaptive_strategy: "ai_adaptive",
    ai_adaptive_recovery: "ai_adaptive",
  };

  return aliases[name] || null;
}

/* =====================================================
   GET FAILED PAYMENTS
===================================================== */

async function getFailedPayments() {
  const result = await pool.query(`
    SELECT
      t.id,
      t.amount,
      t.payment_method,
      t.status,
      t.failure_reason,
      t.attempt_count,

      c.name AS customer,
      c.email AS customer_email,
      c.segment AS customer_segment,
      c.lifetime_value,
      c.success_rate AS customer_success_rate

    FROM transactions t

    JOIN customers c
      ON c.id = t.customer_id

    WHERE t.status = 'failed'

    ORDER BY t.created_at DESC
  `);

  return result.rows;
}

/* =====================================================
   RUN SIMULATION
===================================================== */

router.post("/run", async (req, res) => {
  try {
    const requestedPayments = Math.min(
      Math.max(
        Number(req.body?.numberOfPayments) || 100,
        1
      ),
      MAX_SIMULATION_PAYMENTS
    );

    /* ---------------------------------------------
       SELECTED STRATEGIES
    --------------------------------------------- */

    const strategyInput = Array.isArray(
      req.body?.strategies
    )
      ? req.body.strategies
      : [];

    const selectedStrategyIds = [
      ...new Set(
        strategyInput
          .map(normalizeStrategy)
          .filter(Boolean)
      ),
    ];

    const finalSelectedStrategyIds =
      selectedStrategyIds.length > 0
        ? selectedStrategyIds
        : STRATEGIES.map(
            (strategy) => strategy.id
          );

    const selectedStrategies =
      STRATEGIES.filter((strategy) =>
        finalSelectedStrategyIds.includes(
          strategy.id
        )
      );

    if (!selectedStrategies.length) {
      return res.status(400).json({
        success: false,
        message:
          "Please select at least one recovery strategy.",
      });
    }

    /* ---------------------------------------------
       LOAD FAILED PAYMENTS
    --------------------------------------------- */

    const failedPayments =
      await getFailedPayments();

    if (!failedPayments.length) {
      return res.json({
        success: true,

        data: {
          summary: {
            paymentsSimulated: 0,
            revenueAtRisk: 0,
            currentExpectedRecovery: 0,
            recoveredRevenue: 0,
            additionalRecovery: 0,
            recoveryRate: 0,

            // NEW
            baselineRevenue: 0,
            aiRevenue: 0,
            incrementalRevenue: 0,
            incrementalRecoveryRate: 0,
          },

          outcomes: {
            recovered: 0,
            retryScheduled: 0,
            escalated: 0,
            stopped: 0,
          },

          guardrails: {
            maxRetryAttempts:
              MAX_RETRY_ATTEMPTS,

            minimumProbability:
              MIN_RECOVERY_PROBABILITY,

            highValueApproval: true,

            highValueThreshold:
              HIGH_VALUE_THRESHOLD,
          },

          strategies:
            selectedStrategies.map(
              (strategy) => ({
                strategy: strategy.id,
                recoveryRate: 0,
                recoveredRevenue: 0,
              })
            ),

          transactions: [],

          recommendation: null,

          selectedStrategies:
            finalSelectedStrategyIds,
        },
      });
    }

    /* =================================================
       CREATE SIMULATION BATCH
    ================================================= */

    const simulationPayments = [];

    for (
      let i = 0;
      i < requestedPayments;
      i++
    ) {
      simulationPayments.push(
        failedPayments[
          i % failedPayments.length
        ]
      );
    }

    /* =================================================
       REVENUE AT RISK
    ================================================= */

    const revenueAtRisk =
      simulationPayments.reduce(
        (total, payment) =>
          total +
          Number(payment.amount || 0),
        0
      );

    /* =================================================
       BASELINE RECOVERY
       
       What could be recovered without
       our AI recovery system.
    ================================================= */

    const baselineRevenue =
      revenueAtRisk *
      (BASELINE_RECOVERY_RATE / 100);

    /* =================================================
       AI RECOVERY PROCESS
    ================================================= */

    let aiRecoveredRevenue = 0;

    let recovered = 0;
    let retryScheduled = 0;
    let escalated = 0;
    let stopped = 0;

    const transactions = [];

    /* =================================================
       PROCESS EACH PAYMENT
    ================================================= */

    for (const payment of simulationPayments) {
      const score =
        calculateRecoveryScore(payment);

      const action =
        recommendAction(
          payment,
          score
        );

      const priority =
        priorityFromScore(score);

      const policy =
        evaluateRecoveryPolicy(
          payment,
          score,
          action
        );

      let outcome = "STOPPED";
      let recoveredAmount = 0;

      /* ---------------------------------------------
         BLOCK
      --------------------------------------------- */

      if (
        policy.decision === "BLOCK"
      ) {
        outcome = "STOPPED";
        stopped++;
      }

      /* ---------------------------------------------
         ESCALATE
      --------------------------------------------- */

      else if (
        policy.decision === "ESCALATE"
      ) {
        outcome = "ESCALATED";
        escalated++;
      }

      /* ---------------------------------------------
         ALLOW
      --------------------------------------------- */

      else {
        outcome = "RECOVERED";

        /*
          AI recovery value is based on
          recovery probability.
        */

        recoveredAmount =
          Number(payment.amount || 0) *
          (score / 100);

        aiRecoveredRevenue +=
          recoveredAmount;

        recovered++;

        if (
          action === "SMART_RETRY" ||
          action === "RETRY_LATER" ||
          action ===
            "AUTHENTICATION_RETRY"
        ) {
          retryScheduled++;
        }
      }

      transactions.push({
        transactionId: payment.id,

        customer: payment.customer,

        amount: Number(
          payment.amount || 0
        ),

        recoveryProbability: score,

        action,

        priority,

        guardrail:
          policy.decision,

        outcome,

        recoveredAmount: Number(
          recoveredAmount.toFixed(2)
        ),

        decisionReason:
          policy.reasons?.length
            ? policy.reasons.join(". ")
            : `Recovery probability ${score}% supports ${action}.`,

        demoSummary: {
          recoveryProbability: score,

          recommendedAction:
            action,

          guardrailDecision:
            policy.decision,

          recoveredAmount:
            Number(
              recoveredAmount.toFixed(2)
            ),
        },
      });
    }

    /* =================================================
       AI RECOVERY RATE
    ================================================= */

    const aiRecoveryRate =
      revenueAtRisk > 0
        ? (aiRecoveredRevenue /
            revenueAtRisk) *
          100
        : 0;

    /* =================================================
       INCREMENTAL MONEY RECOVERED
       
       This is the MOST IMPORTANT metric.
       
       AI Recovery - Baseline Recovery
    ================================================= */

    const incrementalRevenue =
      Math.max(
        0,
        aiRecoveredRevenue -
          baselineRevenue
      );

    /* =================================================
       INCREMENTAL RECOVERY RATE
    ================================================= */

    const incrementalRecoveryRate =
      revenueAtRisk > 0
        ? (incrementalRevenue /
            revenueAtRisk) *
          100
        : 0;

    /* =================================================
       STRATEGY PERFORMANCE
    ================================================= */

    const strategyResults =
      selectedStrategies.map(
        (strategy) => {
          const strategyRate =
            Math.min(
              aiRecoveryRate +
                strategy.bonus,
              strategy.cap
            );

          const strategyRevenue =
            revenueAtRisk *
            (strategyRate / 100);

          /*
            Strategy incremental revenue
            against the same baseline.
          */

          const strategyIncremental =
            Math.max(
              0,
              strategyRevenue -
                baselineRevenue
            );

          return {
            strategy: strategy.id,

            recoveryRate:
              Number(
                strategyRate.toFixed(1)
              ),

            recoveredRevenue:
              Number(
                strategyRevenue.toFixed(2)
              ),

            // NEW
            baselineRevenue:
              Number(
                baselineRevenue.toFixed(2)
              ),

            incrementalRevenue:
              Number(
                strategyIncremental.toFixed(
                  2
                )
              ),
          };
        }
      );

    /* =================================================
       BEST STRATEGY
    ================================================= */

    const recommendedStrategy =
      [...strategyResults].sort(
        (a, b) =>
          Number(b.incrementalRevenue) -
          Number(a.incrementalRevenue)
      )[0];

    /* =================================================
       RESPONSE
    ================================================= */

    return res.json({
      success: true,

      data: {
        /* =========================================
           MONEY RECOVERY SUMMARY
        ========================================= */

        summary: {
          paymentsSimulated:
            requestedPayments,

          /*
            Total failed money exposed
          */

          revenueAtRisk:
            Number(
              revenueAtRisk.toFixed(2)
            ),

          /*
            Expected recovery without
            AI intervention
          */

          currentExpectedRecovery:
            Number(
              baselineRevenue.toFixed(2)
            ),

          /*
            Actual simulated recovery
            through recovery engine
          */

          recoveredRevenue:
            Number(
              aiRecoveredRevenue.toFixed(2)
            ),

          /*
            NEW:
            Extra money recovered
            because of our system
          */

          additionalRecovery:
            Number(
              incrementalRevenue.toFixed(
                2
              )
            ),

          /*
            AI recovery percentage
          */

          recoveryRate:
            Number(
              aiRecoveryRate.toFixed(1)
            ),

          /* =====================================
             EXPLICIT DEMO METRICS
          ===================================== */

          baselineRevenue:
            Number(
              baselineRevenue.toFixed(2)
            ),

          aiRevenue:
            Number(
              aiRecoveredRevenue.toFixed(2)
            ),

          incrementalRevenue:
            Number(
              incrementalRevenue.toFixed(
                2
              )
            ),

          incrementalRecoveryRate:
            Number(
              incrementalRecoveryRate.toFixed(
                1
              )
            ),

          recommendedStrategy:
            recommendedStrategy?.strategy ||
            null,
        },

        /* =========================================
           OUTCOMES
        ========================================= */

        outcomes: {
          recovered,

          retryScheduled,

          escalated,

          stopped,
        },

        /* =========================================
           GUARDRAILS
        ========================================= */

        guardrails: {
          maxRetryAttempts:
            MAX_RETRY_ATTEMPTS,

          minimumProbability:
            MIN_RECOVERY_PROBABILITY,

          highValueApproval: true,

          highValueThreshold:
            HIGH_VALUE_THRESHOLD,
        },

        /* =========================================
           STRATEGY PERFORMANCE
        ========================================= */

        strategies:
          strategyResults,

        selectedStrategies:
          finalSelectedStrategyIds,

        /* =========================================
           RECOMMENDATION
        ========================================= */

        recommendation: {
          strategy:
            recommendedStrategy?.strategy ||
            null,

          recoveryRate:
            recommendedStrategy
              ? Number(
                  recommendedStrategy.recoveryRate
                )
              : 0,

          recoveredRevenue:
            recommendedStrategy
              ? Number(
                  recommendedStrategy.recoveredRevenue
                )
              : 0,

          /*
            IMPORTANT:
            Show actual additional money
            recovered by the strategy.
          */

          incrementalRevenue:
            recommendedStrategy
              ? Number(
                  recommendedStrategy.incrementalRevenue
                )
              : 0,

          reason:
            recommendedStrategy
              ? "Highest incremental revenue recovery among the selected strategies."
              : null,
        },

        /* =========================================
           TRANSACTION LEVEL DECISIONS
        ========================================= */

        transactions,
      },
    });
  } catch (error) {
    console.error(
      "Simulation error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Simulation failed",
      error: error.message,
    });
  }
});

export default router;