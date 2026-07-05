import type { RuleResult, VendorFormData, ValidationStepStatus } from "@/lib/types";

const REQUIRED_FIELDS: { key: keyof VendorFormData; label: string }[] = [
  { key: "companyName", label: "Company Name" },
  { key: "legalName", label: "Legal Name" },
  { key: "country", label: "Country" },
  { key: "registrationNumber", label: "Registration Number" },
  { key: "taxId", label: "Tax ID" },
  { key: "taxType", label: "Tax Type" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "address", label: "Address" },
  { key: "bankAccountName", label: "Bank Account Name" },
  { key: "bankAccountNumber", label: "Bank Account Number" },
  { key: "ifscSwift", label: "IFSC/SWIFT Code" },
];

export function validateRequiredFields(vendor: VendorFormData): RuleResult {
  const missingFields: string[] = [];

  for (const field of REQUIRED_FIELDS) {
    const value = vendor[field.key];
    if (!value || (typeof value === "string" && value.trim().length === 0)) {
      missingFields.push(field.label);
    }
  }

  const hasMissing = missingFields.length > 0;
  const riskPoints = missingFields.length * 5;

  let status: ValidationStepStatus;
  let message: string;

  if (!hasMissing) {
    status = "PASSED";
    message = "All required fields are present and non-empty.";
  } else if (missingFields.length <= 2) {
    status = "WARNING";
    message = `${missingFields.length} required field(s) missing: ${missingFields.join(", ")}`;
  } else {
    status = "FAILED";
    message = `${missingFields.length} required field(s) missing: ${missingFields.join(", ")}`;
  }

  return {
    stepName: "Required Fields Check",
    status,
    message,
    details: {
      totalRequired: REQUIRED_FIELDS.length,
      totalPresent: REQUIRED_FIELDS.length - missingFields.length,
      missingFields,
    },
    riskPoints,
  };
}
