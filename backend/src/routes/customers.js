import { Router } from "express";
import { pool } from "../config/db.js";

const router = Router();

/* =========================================================
   GET ALL CUSTOMERS
========================================================= */

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        c.id,
        c.name,
        c.email,
        c.segment,
        c.success_rate,
        c.lifetime_value,

        COUNT(t.id) AS total_transactions,

        COUNT(
          CASE
            WHEN t.status = 'failed'
            THEN 1
          END
        ) AS failed_payments,

        COUNT(
          CASE
            WHEN t.status = 'recovered'
            THEN 1
          END
        ) AS recovered_payments,

        COALESCE(
          SUM(
            CASE
              WHEN t.status = 'recovered'
              THEN t.recovered_amount
              ELSE 0
            END
          ),
          0
        ) AS recovered_revenue

      FROM customers c

      LEFT JOIN transactions t
        ON t.customer_id = c.id

      GROUP BY
        c.id,
        c.name,
        c.email,
        c.segment,
        c.success_rate,
        c.lifetime_value

      ORDER BY c.lifetime_value DESC
    `);

    res.json(result.rows);

  } catch (error) {
    console.error("Customers API error:", error);

    res.status(500).json({
      message: "Failed to fetch customers"
    });
  }
});


/* =========================================================
   ADD CUSTOMER
========================================================= */

router.post("/", async (req, res) => {
  try {
    const {
      name,
      email,
      segment,
      lifetime_value,
      success_rate
    } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        message: "Name and email are required"
      });
    }

    const result = await pool.query(
      `
      INSERT INTO customers
      (
        name,
        email,
        segment,
        lifetime_value,
        success_rate
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [
        name.trim(),
        email.trim().toLowerCase(),
        segment || "REGULAR",
        Number(lifetime_value || 0),
        Number(success_rate || 70)
      ]
    );

    res.status(201).json({
      message: "Customer added successfully",
      customer: result.rows[0]
    });

  } catch (error) {
    console.error("Add customer error:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        message: "A customer with this email already exists"
      });
    }

    res.status(500).json({
      message: "Failed to add customer"
    });
  }
});


export default router;