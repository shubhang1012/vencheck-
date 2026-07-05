import type { RuleResult, ValidationStepStatus } from "@/lib/types";

// Country-specific tax ID patterns
const TAX_PATTERNS: Record<
  string,
  { pattern: RegExp; label: string; example: string }
> = {
  INDIA_GST: {
    pattern: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
    label: "Indian GST Number",
    example: "22ABCDE1234F1Z5",
  },
  US_EIN: {
    pattern: /^\d{2}-\d{7}$/,
    label: "US EIN",
    example: "12-3456789",
  },
  UK_VAT: {
    pattern: /^GB\d{9}$/,
    label: "UK VAT Number",
    example: "GB123456789",
  },
};

// Map country names/codes to expected tax type
const COUNTRY_TAX_MAP: Record<string, string[]> = {
  india: ["INDIA_GST", "GST"],
  in: ["INDIA_GST", "GST"],
  "united states": ["US_EIN", "EIN"],
  us: ["US_EIN", "EIN"],
  usa: ["US_EIN", "EIN"],
  "united kingdom": ["UK_VAT", "VAT"],
  uk: ["UK_VAT", "VAT"],
  gb: ["UK_VAT", "VAT"],
};

function detectTaxFormat(taxId: string): string | null {
  for (const [key, { pattern }] of Object.entries(TAX_PATTERNS)) {
    if (pattern.test(taxId.toUpperCase())) {
      return key;
    }
  }
  return null;
}

function getExpectedTaxTypes(country: string): string[] | null {
  const normalized = country.toLowerCase().trim();
  return COUNTRY_TAX_MAP[normalized] || null;
}

export function validateTaxId(
  taxId: string,
  taxType: string,
  country: string
): RuleResult {
  const upperTaxId = taxId.toUpperCase().trim();
  const detectedFormat = detectTaxFormat(upperTaxId);
  const expectedTaxTypes = getExpectedTaxTypes(country);

  // Step 1: Check if the tax ID matches any known pattern
  let formatValid = false;
  let formatLabel = "Unknown";
  let riskPoints = 0;

  if (detectedFormat) {
    formatValid = true;
    formatLabel = TAX_PATTERNS[detectedFormat].label;
  } else {
    // Generic fallback: must be at least 5 chars alphanumeric
    const genericPattern = /^[A-Z0-9\-]{5,30}$/;
    formatValid = genericPattern.test(upperTaxId);
    formatLabel = "Generic Tax ID";
  }

  // Step 2: Check for country-tax mismatch
  let countryMismatch = false;
  let mismatchDetails = "";

  if (detectedFormat && expectedTaxTypes) {
    // We detected a format AND we know what the country expects
    const countryExpectsThisFormat = expectedTaxTypes.some(
      (t) => t === detectedFormat || t === taxType.toUpperCase()
    );
    if (!countryExpectsThisFormat) {
      countryMismatch = true;
      mismatchDetails = `Country "${country}" does not match tax ID format "${formatLabel}". Expected format for ${country}: ${expectedTaxTypes[0]}`;
    }
  } else if (!detectedFormat && expectedTaxTypes) {
    // We know what the country expects but the tax ID doesn't match any known pattern
    const expectedPattern = TAX_PATTERNS[expectedTaxTypes[0]];
    if (expectedPattern) {
      // Check specifically against expected pattern
      const matchesExpected = expectedPattern.pattern.test(upperTaxId);
      if (!matchesExpected) {
        formatValid = false;
        formatLabel = expectedPattern.label;
        mismatchDetails = `Tax ID does not match expected ${expectedPattern.label} format. Example: ${expectedPattern.example}`;
      }
    }
  }

  // Determine status and risk
  let status: ValidationStepStatus;
  let message: string;

  if (countryMismatch) {
    status = "FAILED";
    message = `Country-Tax ID mismatch detected. ${mismatchDetails}`;
    riskPoints = 25; // Country-tax mismatch = +25
  } else if (!formatValid) {
    status = "FAILED";
    message = `Tax ID "${taxId}" does not match expected format for ${formatLabel}. ${mismatchDetails}`;
    riskPoints = 15; // Tax ID format invalid = +15
  } else {
    status = "PASSED";
    message = `Tax ID "${taxId}" is valid (${formatLabel}).`;
    riskPoints = 0;
  }

  return {
    stepName: "Tax ID Validation",
    status,
    message,
    details: {
      taxId,
      taxType,
      country,
      detectedFormat: detectedFormat || "generic",
      formatValid,
      countryMismatch,
      mismatchDetails: mismatchDetails || null,
    },
    riskPoints,
  };
}
