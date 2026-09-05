import { Router } from "express";
import { pool } from "../config/db.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    // ==============================
    // OVERALL SUMMARY
    // ==============================

    const summaryResult = await pool.query(`
      SELECT
        COUNT(*) AS total_transactions,

        COUNT(*) FILTER (
          WHERE status = 'failed'
        ) AS failed_payments,

        COUNT(*) FILTER (
          WHERE status = 'recovered'
        ) AS recovered_payments,

        COALESCE(
          SUM(amount) FILTER (
            WHERE status = 'failed'
          ),
          0
        ) AS revenue_at_risk,

        COALESCE(
          SUM(recovered_amount) FILTER (
            WHERE status = 'recovered'
          ),
          0
        ) AS recovered_revenue,

        COALESCE(
          ROUND(
            (
              COUNT(*) FILTER (
                WHERE status = 'recovered'
              )::numeric
              /
              NULLIF(COUNT(*), 0)
            ) * 100,
            2
          ),
          0
        ) AS recovery_rate

      FROM transactions
    `);

    // ==============================
    // FAILURE REASONS
    // ==============================

    const failureResult = await pool.query(`
      SELECT
        COALESCE(
          failure_reason,
          'unknown'
        ) AS failure_reason,

        COUNT(*) AS count,

        COALESCE(
          SUM(amount),
          0
        ) AS amount

      FROM transactions

      WHERE status = 'failed'

      GROUP BY failure_reason

      ORDER BY count DESC
    `);

    // ==============================
    // RECOVERY STRATEGIES
    // ==============================

    const strategyResult = await pool.query(`
      SELECT
        recommended_action,

        COUNT(*) AS total_actions,

        COUNT(*) FILTER (
          WHERE status = 'executed'
        ) AS executed_actions,

        COUNT(*) FILTER (
          WHERE status = 'approved'
        ) AS approved_actions,

        COUNT(*) FILTER (
          WHERE status = 'recommended'
        ) AS pending_actions

      FROM recovery_actions

      GROUP BY recommended_action

      ORDER BY total_actions DESC
    `);

    // ==============================
    // RECOVERY SCORE DISTRIBUTION
    // ==============================

    const scoreResult = await pool.query(`
      SELECT
        COUNT(*) FILTER (
          WHERE recovery_score >= 85
        ) AS high,

        COUNT(*) FILTER (
          WHERE recovery_score >= 65
          AND recovery_score < 85
        ) AS medium,

        COUNT(*) FILTER (
          WHERE recovery_score < 65
        ) AS low

      FROM recovery_actions
    `);

    // ==============================
    // PAYMENT METHOD ANALYTICS
    // ==============================

    const paymentMethodResult = await pool.query(`
      SELECT
        payment_method,

        COUNT(*) AS total,

        COUNT(*) FILTER (
          WHERE status = 'failed'
        ) AS failed,

        COUNT(*) FILTER (
          WHERE status = 'recovered'
        ) AS recovered,

        COALESCE(
          SUM(amount),
          0
        ) AS total_amount

      FROM transactions

      GROUP BY payment_method

      ORDER BY total DESC
    `);

    // ==============================
    // DAILY RECOVERY TREND
    // ==============================

    const trendResult = await pool.query(`
      SELECT
        DATE(created_at) AS date,

        COUNT(*) FILTER (
          WHERE status = 'failed'
        ) AS failed,

        COUNT(*) FILTER (
          WHERE status = 'recovered'
        ) AS recovered,

        COALESCE(
          SUM(amount) FILTER (
            WHERE status = 'failed'
          ),
          0
        ) AS revenue_at_risk,

        COALESCE(
          SUM(recovered_amount) FILTER (
            WHERE status = 'recovered'
          ),
          0
        ) AS recovered_revenue

      FROM transactions

      GROUP BY DATE(created_at)

      ORDER BY DATE(created_at) ASC
    `);

    // ==============================
    // TOP CUSTOMERS BY RISK
    // ==============================

    const customerRiskResult = await pool.query(`
      SELECT
        c.id,
        c.name,
        c.email,
        c.segment,
        c.lifetime_value,
        c.success_rate,

        COUNT(t.id) FILTER (
          WHERE t.status = 'failed'
        ) AS failed_payments,

        COALESCE(
          SUM(t.amount) FILTER (
            WHERE t.status = 'failed'
          ),
          0
        ) AS revenue_at_risk

      FROM customers c

      LEFT JOIN transactions t
        ON t.customer_id = c.id

      GROUP BY
        c.id,
        c.name,
        c.email,
        c.segment,
        c.lifetime_value,
        c.success_rate

      HAVING COUNT(t.id) FILTER (
        WHERE t.status = 'failed'
      ) > 0

      ORDER BY revenue_at_risk DESC

      LIMIT 10
    `);

    const summary = summaryResult.rows[0] || {};
    const score = scoreResult.rows[0] || {};

    // ==============================
    // FORMAT NUMBERS
    // ==============================

    const data = {
      summary: {
        totalTransactions: Number(
          summary.total_transactions || 0
        ),

        failedPayments: Number(
          summary.failed_payments || 0
        ),

        recoveredPayments: Number(
          summary.recovered_payments || 0
        ),

        revenueAtRisk: Number(
          summary.revenue_at_risk || 0
        ),

        recoveredRevenue: Number(
          summary.recovered_revenue || 0
        ),

        recoveryRate: Number(
          summary.recovery_rate || 0
        ),
      },

      failureReasons:
        failureResult.rows.map((row) => ({
          reason: row.failure_reason,
          count: Number(row.count || 0),
          amount: Number(row.amount || 0),
        })),

      strategies:
        strategyResult.rows.map((row) => ({
          action:
            row.recommended_action ||
            "UNKNOWN",

          total: Number(
            row.total_actions || 0
          ),

          executed: Number(
            row.executed_actions || 0
          ),

          approved: Number(
            row.approved_actions || 0
          ),

          pending: Number(
            row.pending_actions || 0
          ),
        })),

      scoreDistribution: {
        high: Number(score.high || 0),
        medium: Number(score.medium || 0),
        low: Number(score.low || 0),
      },

      paymentMethods:
        paymentMethodResult.rows.map(
          (row) => ({
            method:
              row.payment_method,

            total: Number(
              row.total || 0
            ),

            failed: Number(
              row.failed || 0
            ),

            recovered: Number(
              row.recovered || 0
            ),

            amount: Number(
              row.total_amount || 0
            ),
          })
        ),

      trend:
        trendResult.rows.map((row) => ({
          date: row.date,

          failed: Number(
            row.failed || 0
          ),

          recovered: Number(
            row.recovered || 0
          ),

          revenueAtRisk: Number(
            row.revenue_at_risk || 0
          ),

          recoveredRevenue: Number(
            row.recovered_revenue || 0
          ),
        })),

      topCustomers:
        customerRiskResult.rows.map(
          (row) => ({
            id: row.id,

            name: row.name,

            email: row.email,

            segment: row.segment,

            lifetimeValue: Number(
              row.lifetime_value || 0
            ),

            successRate: Number(
              row.success_rate || 0
            ),

            failedPayments: Number(
              row.failed_payments || 0
            ),

            revenueAtRisk: Number(
              row.revenue_at_risk || 0
            ),
          })
        ),
    };

    res.json(data);
  } catch (error) {
    console.error(
      "Analytics error:",
      error
    );

    res.status(500).json({
      message: "Analytics data failed",
      error: error.message,
    });
  }
});

export default router;