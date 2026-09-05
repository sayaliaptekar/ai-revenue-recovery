import jwt from "jsonwebtoken";

export function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ")
    ? header.slice(7)
    : null;

  console.log("AUTH HEADER:", header ? "PRESENT" : "MISSING");
  console.log("JWT SECRET EXISTS:", !!process.env.JWT_SECRET);

  if (!token) {
    return res.status(401).json({
      message: "Authentication required",
    });
  }

  try {
    const secret =
      process.env.JWT_SECRET ||
      "revenue_recovery_demo_secret_2026";

    const decoded = jwt.verify(token, secret);

    console.log("TOKEN VALID:", decoded.email);

    req.user = decoded;
    next();
  } catch (error) {
    console.log("AUTH ERROR:", error.name, error.message);

    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
}