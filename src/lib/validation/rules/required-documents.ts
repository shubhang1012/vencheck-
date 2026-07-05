import type { RuleResult, ValidationStepStatus } from "@/lib/types";

const REQUIRED_DOCUMENT_TYPES = [
  "GST_CERTIFICATE",
  "CERTIFICATE_OF_INCORPORATION",
  "CANCELLED_CHEQUE",
  "PAN_CARD",
] as const;

const DOCUMENT_LABELS: Record<string, string> = {
  GST_CERTIFICATE: "GST Certificate",
  CERTIFICATE_OF_INCORPORATION: "Certificate of Incorporation",
  CANCELLED_CHEQUE: "Cancelled Cheque",
  PAN_CARD: "PAN Card",
};

interface DocumentInfo {
  type: string;
  fileName: string;
}

export function validateRequiredDocuments(
  documents: DocumentInfo[]
): RuleResult {
  const uploadedTypes = new Set(documents.map((d) => d.type));
  const missingDocuments: string[] = [];

  for (const docType of REQUIRED_DOCUMENT_TYPES) {
    if (!uploadedTypes.has(docType)) {
      missingDocuments.push(DOCUMENT_LABELS[docType] || docType);
    }
  }

  const riskPoints = missingDocuments.length * 15;
  let status: ValidationStepStatus;
  let message: string;

  if (missingDocuments.length === 0) {
    status = "PASSED";
    message = `All ${REQUIRED_DOCUMENT_TYPES.length} required documents are uploaded.`;
  } else if (missingDocuments.length <= 1) {
    status = "WARNING";
    message = `${missingDocuments.length} required document(s) missing: ${missingDocuments.join(", ")}`;
  } else {
    status = "FAILED";
    message = `${missingDocuments.length} required document(s) missing: ${missingDocuments.join(", ")}`;
  }

  return {
    stepName: "Required Documents Check",
    status,
    message,
    details: {
      totalRequired: REQUIRED_DOCUMENT_TYPES.length,
      totalUploaded: uploadedTypes.size,
      missingDocuments,
      uploadedDocuments: documents.map((d) => ({
        type: d.type,
        label: DOCUMENT_LABELS[d.type] || d.type,
        fileName: d.fileName,
      })),
    },
    riskPoints,
  };
}
