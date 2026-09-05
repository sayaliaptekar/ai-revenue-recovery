import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import dashboardRoutes from "./routes/dashboard.js";
import paymentRoutes from "./routes/payments.js";
import recoveryRoutes from "./routes/recovery.js";
import { authRequired } from "./middleware/auth.js";
import customerRoutes from "./routes/customers.js";
import analyticsRoutes from "./routes/analytics.js";
import customersRoutes from "./routes/customers.js";
import simulatorRoutes from "./routes/simulator.js";

dotenv.config();

const app = express();
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.get("/api/health", (req,res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/dashboard", authRequired, dashboardRoutes);
app.use("/api/payments", authRequired, paymentRoutes);
app.use("/api/recovery", authRequired, recoveryRoutes);
app.use("/api/simulator", simulatorRoutes);
app.use("/api/analytics", authRequired, analyticsRoutes);
app.use("/api/customers", authRequired, customersRoutes);

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Backend running on http://localhost:${port}`));
