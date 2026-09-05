const HARD_STOP_REASONS = [
  "card_expired",
];

const MAX_RETRY_ATTEMPTS = 3;
const MIN_RECOVERY_PROBABILITY = 60;
const HIGH_VALUE_AMOUNT = 20000;

export function evaluateRecoveryPolicy(
  payment,
  recoveryProbability,
  action
) {
  const probability = Number(recoveryProbability);
  const attempts = Number(payment.attempt_count);
  const amount = Number(payment.amount);

  const reasons = [];
  let decision = "ALLOW";

  // ---------------------------------------
  // 1. ALREADY RECOVERED
  // ---------------------------------------

  if (payment.status === "recovered") {
    decision = "BLOCK";
    reasons.push("Payment is already recovered");
  }

  // ---------------------------------------
  // 2. MAX 3 RETRY STOPPING RULE
  // ---------------------------------------

  if (attempts >= MAX_RETRY_ATTEMPTS) {
    decision = "BLOCK";

    reasons.push(
      `Maximum retry limit of ${MAX_RETRY_ATTEMPTS} reached`
    );
  }

  // ---------------------------------------
  // 3. HARD STOP
  // ---------------------------------------

  if (
    HARD_STOP_REASONS.includes(
      payment.failure_reason
    )
  ) {
    decision = "BLOCK";

    reasons.push(
      "Payment method requires customer update"
    );
  }

  // ---------------------------------------
  // 4. 60% MINIMUM PROBABILITY GUARDRAIL
  // ---------------------------------------

  if (
    probability < MIN_RECOVERY_PROBABILITY
  ) {
    decision = "ESCALATE";

    reasons.push(
      `Recovery probability below ${MIN_RECOVERY_PROBABILITY}%`
    );
  }

  // ---------------------------------------
  // 5. ₹20,000+ MERCHANT APPROVAL
  // ---------------------------------------

  if (
    amount >= HIGH_VALUE_AMOUNT
  ) {
    decision = "ESCALATE";

    reasons.push(
      "High-value transaction requires merchant approval"
    );
  }

  // ---------------------------------------
  // 6. HARD STOP ALWAYS WINS
  // ---------------------------------------

  if (
    payment.status === "recovered" ||
    attempts >= MAX_RETRY_ATTEMPTS ||
    HARD_STOP_REASONS.includes(
      payment.failure_reason
    )
  ) {
    decision = "BLOCK";
  }

  return {
    decision,

    allowed:
      decision === "ALLOW",

    reasons,

    maxRetries:
      MAX_RETRY_ATTEMPTS,

    minimumProbability:
      MIN_RECOVERY_PROBABILITY,

    highValueThreshold:
      HIGH_VALUE_AMOUNT,

    action,
  };
}