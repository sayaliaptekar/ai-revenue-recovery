import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../config/db.js";

const router = Router();

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Demo login
    if (
      email?.trim() === "merchant@demo.com" &&
      password === "Demo@123"
    ) {
      const token = jwt.sign(
        {
          id: 1,
          name: "Demo Merchant",
          email: "merchant@demo.com"
        },
        process.env.JWT_SECRET ||
          "revenue_recovery_demo_secret_2026",
        {
          expiresIn: "8h"
        }
      );

      return res.json({
        token,
        merchant: {
          id: 1,
          name: "Demo Merchant",
          email: "merchant@demo.com"
        }
      });
    }

    const result = await pool.query(
      `
      SELECT id, name, email, password_hash
      FROM merchants
      WHERE email=$1
      `,
      [email]
    );

    const merchant = result.rows[0];

    if (
      !merchant ||
      !(await bcrypt.compare(
        password,
        merchant.password_hash
      ))
    ) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    const token = jwt.sign(
      {
        id: merchant.id,
        email: merchant.email,
        name: merchant.name
      },
      process.env.JWT_SECRET ||
        "revenue_recovery_demo_secret_2026",
      {
        expiresIn: "8h"
      }
    );

    res.json({
      token,
      merchant: {
        id: merchant.id,
        name: merchant.name,
        email: merchant.email
      }
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);

    res.status(500).json({
      message: "Login failed",
      error: error.message
    });
  }
});

export default router;