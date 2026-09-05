import { Router } from "express";
import { pool } from "../config/db.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*, c.name AS customer_name, c.email, c.success_rate AS customer_success_rate, c.segment AS customer_segment
      FROM transactions t
      JOIN customers c ON c.id=t.customer_id
      ORDER BY t.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not load payments" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*, c.name AS customer_name, c.email, c.success_rate AS customer_success_rate, c.segment AS customer_segment, c.lifetime_value
      FROM transactions t
      JOIN customers c ON c.id=t.customer_id
      WHERE t.id=$1
    `, [req.params.id]);

    if (!result.rows[0]) return res.status(404).json({ message: "Payment not found" });
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not load payment" });
  }
});

export default router;
