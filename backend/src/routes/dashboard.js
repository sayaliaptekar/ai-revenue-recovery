import { Router } from "express";
import { pool } from "../config/db.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) FILTER (
          WHERE status = 'failed'
        ) AS failed_payments,

        COUNT(*) FILTER (
          WHERE status = 'recovered'
        ) AS recovered_transactions,

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

    const row = result.rows[0];

    const failedPayments =
      Number(row.failed_payments || 0);

    const recoveredTransactions =
      Number(row.recovered_transactions || 0);

    const revenueAtRisk =
      Number(row.revenue_at_risk || 0);

    const recoveredRevenue =
      Number(row.recovered_revenue || 0);

    const recoveryRate =
      Number(row.recovery_rate || 0);

    /*
      Predicted recovery represents the amount
      currently estimated as recoverable from
      failed revenue.

      We use a conservative 60% opportunity estimate
      for the dashboard.
    */
    const predictedRecovery = Math.round(
      revenueAtRisk * 0.60
    );

    res.json({
      stats: {
        failedPayments,

        recoveredTransactions,

        revenueAtRisk,

        predictedRecovery,

        recoveredRevenue,

        recoveryRate,
      },

      /*
        Additional flat values are kept for
        compatibility with other frontend code.
      */
      failedPayments,

      recoveredTransactions,

      revenueAtRisk,

      predictedRecovery,

      recoveredRevenue,

      recoveryRate,
    });
  } catch (error) {
    console.error(
      "Dashboard data error:",
      error.message
    );

    res.status(500).json({
      message: "Dashboard data failed",
    });
  }
});

export default router;