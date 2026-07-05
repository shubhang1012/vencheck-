// ── Enums (matching Prisma string enums) ──

export const VendorStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  PROCESSING: "PROCESSING",
} as const;
export type VendorStatus = (typeof VendorStatus)[keyof typeof VendorStatus];

export const DocumentType = {
  GST_CERTIFICATE: "GST_CERTIFICATE",
  CERTIFICATE_OF_INCORPORATION: "CERTIFICATE_OF_INCORPORATION",
  CANCELLED_CHEQUE: "CANCELLED_CHEQUE",
  PAN_CARD: "PAN_CARD",
} as const;
export type DocumentType = (typeof DocumentType)[keyof typeof DocumentType];

export const ValidationRunStatus = {
  RUNNING: "RUNNING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const;
export type ValidationRunStatus =
  (typeof ValidationRunStatus)[keyof typeof ValidationRunStatus];

export const ValidationStepStatus = {
  PENDING: "PENDING",
  RUNNING: "RUNNING",
  PASSED: "PASSED",
  FAILED: "FAILED",
  WARNING: "WARNING",
  SKIPPED: "SKIPPED",
} as const;
export type ValidationStepStatus =
  (typeof ValidationStepStatus)[keyof typeof ValidationStepStatus];

// ── Form Data ──

export interface VendorFormData {
  companyName: string;
  legalName: string;
  country: string;
  registrationNumber: string;
  taxId: string;
  taxType: string;
  email: string;
  phone: string;
  address: string;
  bankAccountName: string;
  bankAccountNumber: string;
  ifscSwift: string;
  website?: string;
}

// ── Validation Types ──

export interface ValidationStepEvent {
  stepName: string;
  status: ValidationStepStatus;
  message: string;
  details?: Record<string, unknown>;
  duration?: number;
  timestamp: string;
}

export interface ValidationResult {
  issues: ValidationIssue[];
  riskScore: number;
  decision: "APPROVED" | "PENDING" | "REJECTED";
  reasoning: string;
}

export interface ValidationIssue {
  stepName: string;
  severity: "error" | "warning" | "info";
  message: string;
  details?: Record<string, unknown>;
}

// ── Risk Scoring ──

export interface RiskFactor {
  name: string;
  score: number;
  description: string;
}

// ── Document Analysis ──

export interface DocumentAnalysis {
  documentType: string;
  extractedText: string;
  companyNameFound: boolean;
  matchScore: number;
  confidence: number;
}

// ── AI Review ──

export interface FieldMatchDetail {
  fieldName: string;
  expectedValue: string;
  foundValue: string | null;
  status: "match" | "mismatch" | "not_found";
  reasoning: string;
  sourceDocument: string | null;
  isCritical: boolean;
}

export interface AIReviewResult {
  status: "match" | "partial-match" | "mismatch";
  reasoning: string;
  confidence: number;
  documentAnalyses: DocumentAnalysis[];
  fieldMatches?: FieldMatchDetail[];
  crossDocConsistency?: {
    status: "consistent" | "inconsistent";
    details: string;
    documentCompanies: Array<{
      docType: string;
      docName: string;
      companyName: string | null;
    }>;
  };
  ocrTransparency?: Array<{
    fileName: string;
    docType: string;
    status: string;
    fieldsExtracted: string[];
  }>;
}

// ── Rule Result (internal) ──

export interface RuleResult {
  stepName: string;
  status: ValidationStepStatus;
  message: string;
  details?: Record<string, unknown>;
  riskPoints: number;
}
