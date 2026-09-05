import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    })
  : null;

// ---------------- FALLBACK ----------------

function fallback(payment, score, action, priority) {
  const messages = {
    SMART_RETRY:
      `Your payment of ₹${payment.amount} could not be completed. We recommend trying the payment again shortly.`,

    RETRY_LATER:
      `Your payment of ₹${payment.amount} could not be completed. Please try again after some time.`,

    UPDATE_PAYMENT_METHOD:
      `Your payment could not be completed because the payment method may need updating. Please update it and retry.`,

    SEND_REMINDER:
      `Your recent payment of ₹${payment.amount} could not be completed. Please review your payment method and try again.`,

    AUTHENTICATION_RETRY:
      `Your payment needs additional authentication. Please retry and complete the verification step.`,
  };

  return {
    recovery_probability: score,
    priority,
    recommended_action: action,
    reason:
      "The recommendation combines customer payment history, failure type, amount, and attempt count.",
    personalized_message:
      messages[action] || messages.SEND_REMINDER,
    ai_generated: false,
  };
}

// ---------------- GEMINI AI ----------------

export async function analyzeWithAI(
  payment,
  score,
  action,
  priority
) {
  if (!ai) {
    console.log("Gemini API key not configured. Using fallback.");
    return fallback(payment, score, action, priority);
  }

  const prompt = `
You are an AI revenue recovery decision engine.

Analyze this failed payment and recommend the best recovery strategy.

Payment details:

Amount: ₹${payment.amount}
Failure reason: ${payment.failure_reason}
Attempt count: ${payment.attempt_count}
Customer success rate: ${payment.customer_success_rate}
Customer segment: ${payment.customer_segment}

Existing deterministic analysis:

Score: ${score}
Action: ${action}
Priority: ${priority}

Return ONLY valid JSON with exactly these fields:

{
  "recovery_probability": number,
  "priority": "HIGH" | "MEDIUM" | "LOW",
  "recommended_action": "SMART_RETRY" | "RETRY_LATER" | "UPDATE_PAYMENT_METHOD" | "SEND_REMINDER" | "AUTHENTICATION_RETRY",
  "reason": "short explanation",
  "personalized_message": "short customer-facing message"
}

Rules:

- Recovery probability must be between 0 and 100.
- Do not invent facts.
- Reason should briefly explain the decision.
- Customer message should be polite and useful.
- Do not expose internal scoring.
- Return JSON only.
`;

  try {
    console.log("Calling Gemini AI...");

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",

      contents: prompt,

      config: {
        responseFormat: {
          text: {
            mimeType: "application/json",
          },
        },
      },
    });

    const text = response.text?.trim();

    console.log("Gemini response received.");
    console.log("Gemini raw response:", text);

    if (!text) {
      throw new Error("Gemini returned an empty response.");
    }

    // Remove Markdown JSON code fences if Gemini adds them
    const cleaned = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    // Parse Gemini JSON
    const parsed = JSON.parse(cleaned);

    // Gemini sometimes uses customer_message instead
    const personalizedMessage =
      parsed.personalized_message || parsed.customer_message;

    // Validate required fields
    if (
      parsed.recovery_probability === undefined ||
      !parsed.priority ||
      !parsed.recommended_action ||
      !parsed.reason ||
      !personalizedMessage
    ) {
      throw new Error("Gemini returned incomplete JSON.");
    }

    console.log("Gemini JSON parsed successfully.");

    return {
      recovery_probability: Math.max(
  0,
  Math.min(
    100,
    Math.round(
      Number(parsed.recovery_probability)
    )
  )
),
      priority: parsed.priority,
      recommended_action: parsed.recommended_action,
      reason: parsed.reason,
      personalized_message: personalizedMessage,
      ai_generated: true,
    };

  } catch (error) {
    console.error("Gemini AI ERROR:", error);

    console.log("Using deterministic fallback.");

    return fallback(
      payment,
      score,
      action,
      priority
    );
  }
}