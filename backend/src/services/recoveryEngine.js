export function calculateRecoveryScore(payment) {
  let score = 50;

  if (Number(payment.customer_success_rate) >= 90) score += 25;
  else if (Number(payment.customer_success_rate) >= 75) score += 15;
  else if (Number(payment.customer_success_rate) < 50) score -= 15;

  if (payment.failure_reason === "technical_failure") score += 12;
  if (payment.failure_reason === "bank_declined") score += 8;
  if (payment.failure_reason === "authentication_failure") score += 5;
  if (payment.failure_reason === "card_expired") score -= 5;
  if (payment.failure_reason === "insufficient_funds") score -= 2;

  if (Number(payment.attempt_count) === 1) score += 5;
  if (Number(payment.amount) >= 5000) score += 3;

  return Math.max(5, Math.min(98, Math.round(score)));
}

export function recommendAction(payment, score) {
  if (payment.failure_reason === "card_expired") return "UPDATE_PAYMENT_METHOD";
  if (payment.failure_reason === "insufficient_funds") return score >= 70 ? "RETRY_LATER" : "SEND_REMINDER";
  if (payment.failure_reason === "technical_failure") return "SMART_RETRY";
  if (payment.failure_reason === "authentication_failure") return "AUTHENTICATION_RETRY";
  return score >= 75 ? "SMART_RETRY" : "SEND_REMINDER";
}

export function priorityFromScore(score) {
  if (score >= 85) return "HIGH";
  if (score >= 65) return "MEDIUM";
  return "LOW";
}
