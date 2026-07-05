import type { RuleResult, ValidationStepStatus } from "@/lib/types";

const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const SWIFT_PATTERN = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;

function detectCodeType(
  code: string
): { type: "IFSC" | "SWIFT" | "UNKNOWN"; valid: boolean } {
  const upper = code.toUpperCase().trim();

  if (IFSC_PATTERN.test(upper)) {
    return { type: "IFSC", valid: true };
  }
  if (SWIFT_PATTERN.test(upper)) {
    return { type: "SWIFT", valid: true };
  }

  // Heuristic: IFSC codes are 11 chars, SWIFT are 8 or 11
  if (upper.length === 11 && upper[4] === "0") {
    return { type: "IFSC", valid: false };
  }
  if (upper.length === 8 || upper.length === 11) {
    return { type: "SWIFT", valid: false };
  }

  return { type: "UNKNOWN", valid: false };
}

export function validateIfscSwift(code: string): RuleResult {
  if (!code || code.trim().length === 0) {
    return {
      stepName: "IFSC/SWIFT Validation",
      status: "FAILED",
      message: "IFSC/SWIFT code is empty.",
      details: { code, codeType: "UNKNOWN", valid: false },
      riskPoints: 10,
    };
  }

  const { type, valid } = detectCodeType(code);
  let status: ValidationStepStatus;
  let message: string;
  const riskPoints = valid ? 0 : 10;

  if (valid) {
    status = "PASSED";
    message = `${type} code "${code.toUpperCase()}" is valid.`;
  } else if (type !== "UNKNOWN") {
    status = "FAILED";
    message = `"${code}" appears to be an ${type} code but does not match the expected pattern. ${
      type === "IFSC"
        ? "IFSC format: 4 letters + 0 + 6 alphanumeric (e.g., SBIN0001234)"
        : "SWIFT format: 6 letters + 2 alphanumeric + optional 3 alphanumeric (e.g., DEUTDEFF)"
    }`;
  } else {
    status = "FAILED";
    message = `"${code}" does not match IFSC (e.g., SBIN0001234) or SWIFT (e.g., DEUTDEFF) format.`;
  }

  return {
    stepName: "IFSC/SWIFT Validation",
    status,
    message,
    details: {
      code: code.toUpperCase().trim(),
      codeType: type,
      valid,
      ifscPattern: IFSC_PATTERN.source,
      swiftPattern: SWIFT_PATTERN.source,
    },
    riskPoints,
  };
}
