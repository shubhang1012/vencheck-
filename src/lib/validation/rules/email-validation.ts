import type { RuleResult } from "@/lib/types";

// RFC 5322-compliant email regex (practical subset)
const EMAIL_PATTERN =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

// Common disposable email domains to flag
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "tempmail.com",
  "throwaway.email",
  "yopmail.com",
  "10minutemail.com",
  "trashmail.com",
  "discard.email",
  "sharklasers.com",
  "grr.la",
]);

export function validateEmail(email: string): RuleResult {
  if (!email || email.trim().length === 0) {
    return {
      stepName: "Email Validation",
      status: "FAILED",
      message: "Email address is empty.",
      details: { email, valid: false },
      riskPoints: 5,
    };
  }

  const trimmed = email.trim().toLowerCase();
  const isValidFormat = EMAIL_PATTERN.test(trimmed);

  if (!isValidFormat) {
    return {
      stepName: "Email Validation",
      status: "FAILED",
      message: `Email "${email}" does not match RFC-compliant format.`,
      details: {
        email,
        valid: false,
        reason: "format_invalid",
      },
      riskPoints: 5,
    };
  }

  // Check for disposable email domains
  const domain = trimmed.split("@")[1];
  const isDisposable = DISPOSABLE_DOMAINS.has(domain);

  if (isDisposable) {
    return {
      stepName: "Email Validation",
      status: "WARNING",
      message: `Email "${email}" uses a disposable email domain (${domain}).`,
      details: {
        email,
        domain,
        valid: true,
        disposable: true,
      },
      riskPoints: 5,
    };
  }

  return {
    stepName: "Email Validation",
    status: "PASSED",
    message: `Email "${email}" is valid.`,
    details: {
      email: trimmed,
      domain,
      valid: true,
      disposable: false,
    },
    riskPoints: 0,
  };
}
