"use client";

import { use, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Mail,
  Phone,
  Globe,
  Landmark,
  FileText,
  Shield,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Copy,
  Download,
  Brain,
  ChevronDown,
  ChevronRight,
  Loader2,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  cn,
  formatDate,
  formatDuration,
  getStatusColor,
  getRiskColor,
  getRiskBgColor,
} from "@/lib/utils";

interface Document {
  id: string;
  fileName: string;
  fileType: string;
  documentType: string;
  url: string;
  extractedText?: string;
  uploadedAt: string;
}

interface ValidationStep {
  name: string;
  status: string;
  message?: string;
  details?: string;
  duration?: number;
  timestamp?: string;
}

interface AuditEntry {
  id: string;
  action: string;
  details: string;
  timestamp: string;
}

interface VendorDetail {
  id: string;
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
  status: string;
  riskScore: number | null;
  decision?: string;
  reasoning?: string;
  issues?: string[];
  documents: Document[];
  validationSteps: ValidationStep[];
  auditTrail: AuditEntry[];
  createdAt: string;
  updatedAt: string;
}

function StatusIcon({ status }: { status: string }) {
  switch (status.toLowerCase()) {
    case "passed":
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-red-500" />;
    case "warning":
      return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    case "running":
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground/50" />;
  }
}

function InfoField({ label, value, icon: Icon }: { label: string; value?: string; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </dt>
      <dd className="text-sm font-medium">{value || "—"}</dd>
    </div>
  );
}

function cleanAndFormatReasonsForUI(vendor: VendorDetail): string[] {
  const reasons: string[] = [];

  // 1. Company name mismatch
  const nameStep = vendor.validationSteps?.find(
    (s) => s.name === "Company Name Match" && (s.status.toUpperCase() === "FAILED" || s.status.toUpperCase() === "WARNING")
  );
  if (nameStep) {
    reasons.push(`Company Name Match: ${nameStep.message}`);
  }

  // 2. Tax ID validation mismatch
  const taxIdStep = vendor.validationSteps?.find(
    (s) => s.name === "Tax ID Validation" && s.status.toUpperCase() === "FAILED"
  );
  if (taxIdStep) {
    reasons.push(`Tax ID Validation: ${taxIdStep.message}`);
  }

  // 3. Bank Account Consistency mismatch
  const bankStep = vendor.validationSteps?.find(
    (s) => s.name === "Bank Account Consistency" && (s.status.toUpperCase() === "FAILED" || s.status.toUpperCase() === "WARNING")
  );
  if (bankStep) {
    reasons.push(`Bank Account Consistency: ${bankStep.message}`);
  }

  // 4. Duplicate detection
  const dupStep = vendor.validationSteps?.find(
    (s) => s.name === "Duplicate Detection" && (s.status.toUpperCase() === "FAILED" || s.status.toUpperCase() === "WARNING")
  );
  if (dupStep) {
    reasons.push(`Duplicate Detection: ${dupStep.message}`);
  }

  // 5. Document Verification mismatches
  const aiStep = vendor.validationSteps?.find(
    (s) => s.name === "Document Verification" && (s.status.toUpperCase() === "FAILED" || s.status.toUpperCase() === "WARNING")
  );

  if (aiStep && aiStep.details) {
    try {
      const details = JSON.parse(aiStep.details);
      if (details.fieldMatches) {
        const mismatches = details.fieldMatches.filter(
          (m: any) => m.status === "mismatch"
        );
        if (mismatches.length > 0) {
          mismatches.forEach((m: any) => {
            const label = m.fieldName === "taxId" ? "GST Number"
              : m.fieldName === "registrationNumber" ? "Registration Number"
              : m.fieldName === "bankAccountNumber" ? "Bank Account Number"
              : m.fieldName.replace(/([A-Z])/g, " $1").replace(/^./, (str: string) => str.toUpperCase());
            
            reasons.push(
              `Document Verification: Mismatch in "${label}" — submitted "${m.expectedValue || ""}" but document shows "${m.foundValue || "different format"}" in "${m.sourceDocument || ""}".`
            );
          });
        } else {
          reasons.push(`Document Verification: ${aiStep.message}`);
        }
      } else {
        reasons.push(`Document Verification: ${aiStep.message}`);
      }
    } catch (e) {
      reasons.push(`Document Verification: ${aiStep.message}`);
    }
  }

  // Fallback to general issues (excluding Risk Score Calculation)
  if (reasons.length === 0 && vendor.issues) {
    return vendor.issues.filter(
      (issue) => !issue.startsWith("Risk Score Calculation")
    );
  }

  return reasons;
}

function cleanAndFormatReasonsForEmail(vendor: VendorDetail): string {
  const reasons: string[] = [];
  let index = 1;

  // 1. Company Name Match
  const nameStep = vendor.validationSteps?.find(
    (s) => s.name === "Company Name Match" && (s.status.toUpperCase() === "FAILED" || s.status.toUpperCase() === "WARNING")
  );
  if (nameStep) {
    reasons.push(`${index++}. Company Name Match Mismatch

Submitted:
"${vendor.companyName}"

Official Name:
"${vendor.legalName}"

Explanation:
The submitted company name and legal entity name differ significantly. Please ensure the submitted trading/brand name aligns with your official registered legal name.

Source:
Vendor Onboarding Form`);
  }

  // 2. Tax ID Validation
  const taxIdStep = vendor.validationSteps?.find(
    (s) => s.name === "Tax ID Validation" && s.status.toUpperCase() === "FAILED"
  );
  if (taxIdStep) {
    reasons.push(`${index++}. Tax ID Validation Mismatch

Detail:
${taxIdStep.message}

Explanation:
The Tax ID provided does not match the expected formatting rules for your registered country. Please check the spelling/format of your GSTIN/PAN and input it again.

Source:
Vendor Onboarding Form`);
  }

  // 3. Bank Account Consistency
  const bankStep = vendor.validationSteps?.find(
    (s) => s.name === "Bank Account Consistency" && (s.status.toUpperCase() === "FAILED" || s.status.toUpperCase() === "WARNING")
  );
  if (bankStep) {
    reasons.push(`${index++}. Bank Account Consistency Mismatch

Detail:
${bankStep.message}

Explanation:
The entered bank account holder name does not match the registered company name or legal entity name. Please ensure the payout account belongs to the registering business entity.

Source:
Vendor Onboarding Form`);
  }

  // 4. Duplicate detection
  const dupStep = vendor.validationSteps?.find(
    (s) => s.name === "Duplicate Detection" && (s.status.toUpperCase() === "FAILED" || s.status.toUpperCase() === "WARNING")
  );
  if (dupStep) {
    reasons.push(`${index++}. Duplicate Vendor Detected

Detail:
${dupStep.message}

Explanation:
Our systems detected that a vendor profile with identical credentials (GSTIN/PAN/Registration Number) already exists in our database.

Source:
Internal Vendor Database`);
  }

  // 5. Document Verification
  const aiStep = vendor.validationSteps?.find(
    (s) => s.name === "Document Verification" && (s.status.toUpperCase() === "FAILED" || s.status.toUpperCase() === "WARNING")
  );

  if (aiStep && aiStep.details) {
    try {
      const details = JSON.parse(aiStep.details);
      if (details.fieldMatches) {
        const mismatches = details.fieldMatches.filter(
          (m: any) => m.status === "mismatch"
        );
        mismatches.forEach((m: any) => {
          const fieldLabel = m.fieldName === "taxId" ? "GST Number"
            : m.fieldName === "registrationNumber" ? "Registration Number"
            : m.fieldName === "bankAccountNumber" ? "Bank Account Number"
            : m.fieldName.replace(/([A-Z])/g, " $1").replace(/^./, (str: string) => str.toUpperCase());

          reasons.push(
            `${index++}. Official Document Mismatch: ${fieldLabel}

Submitted in Form:
"${m.expectedValue || "—"}"

Found in Uploaded Document:
"${m.foundValue || "—"}"

Explanation:
The value entered in the registration form does not match the corresponding value extracted from the uploaded document. Please verify that the correct and current compliance document was uploaded, or update the form field to match your official certificate.

Source Document:
${m.sourceDocument || "Uploaded Documents"}`
          );
        });
      }
    } catch (e) {
      reasons.push(`${index++}. Document Verification Failed

Detail:
${aiStep.message}

Explanation:
We encountered anomalies verifying the contents of your uploaded compliance certificates. Please review your uploads and ensure high-quality, valid documents are attached.

Source:
Uploaded Documents`);
    }
  }

  if (reasons.length === 0) {
    return "Your application did not satisfy our risk and compliance verification guidelines.";
  }

  return `Reasons for Rejection:\n\n${reasons.join("\n\n--------------------------------\n\n")}`;
}

function generateCommunication(vendor: VendorDetail): string {
  const status = (vendor?.decision || vendor?.status || "pending").toLowerCase();

  if (status === "approved") {
    return `Dear ${vendor.companyName},

Congratulations! We are pleased to inform you that your vendor registration has been approved.

Company: ${vendor.companyName}
Legal Entity: ${vendor.legalName}
Registration Number: ${vendor.registrationNumber}
Risk Assessment Score: ${vendor.riskScore ?? "N/A"}/100

Your vendor profile is now active in our system. You can expect to receive further onboarding details and integration instructions within the next 2-3 business days.

If you have any questions, please don't hesitate to reach out to our vendor management team.

Best regards,
Vencheck Platform`;
  }

  const emailReasons = cleanAndFormatReasonsForEmail(vendor);
  const uiReasons = cleanAndFormatReasonsForUI(vendor);

  if (status === "rejected") {
    return `Dear ${vendor.companyName},

Thank you for your interest in becoming a registered vendor. After a thorough review of your submission, we regret to inform you that your registration has been declined at this time.

${emailReasons}

You may re-apply after addressing the issues listed above. For further assistance, please contact our vendor management team.

Regards,
Vencheck Platform`;
  }

  // Pending
  return `Dear ${vendor.companyName},

Thank you for submitting your vendor registration. Your application is currently under review.

${uiReasons.length > 0 ? `The following items require your attention:\n${uiReasons.map((reason, i) => `${i + 1}. ${reason}`).join("\n")}` : "We are finalizing our compliance checks and will update you shortly."}

Please provide the necessary updates at your earliest convenience to expedite the review process. Our team will notify you once the review is complete.

Regards,
Vencheck Platform`;
}

export default function VendorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [vendor, setVendor] = useState<VendorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchVendor() {
      try {
        const res = await fetch(`/api/vendors/${id}`);
        if (res.status === 404) {
          setVendor(null);
          return;
        }
        if (!res.ok) throw new Error("Failed to fetch vendor");
        const data = await res.json();
        setVendor(data.vendor);
      } catch (error) {
        console.error("Failed to fetch vendor:", error);
        toast.error("Failed to load vendor details");
      } finally {
        setLoading(false);
      }
    }

    fetchVendor();
  }, [id]);

  const communication = useMemo(
    () => (vendor ? generateCommunication(vendor) : ""),
    [vendor]
  );

  const toggleStep = (name: string) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(communication);
    toast.success("Copied to clipboard");
  };

  const downloadAsText = () => {
    const blob = new Blob([communication], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vendor-${vendor?.companyName?.replace(/\s+/g, "-").toLowerCase() || id}-response.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen py-12 px-4">
        <div className="mx-auto max-w-5xl space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-10 w-80" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Vendor Not Found</h2>
          <p className="text-sm text-muted-foreground mb-4">
            The requested vendor could not be found.
          </p>
          <Button asChild variant="outline">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const riskScore = vendor.riskScore ?? 0;

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="mx-auto max-w-5xl">
        {/* Back button */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6"
        >
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500 font-bold text-xl border">
                    {vendor.companyName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">{vendor.companyName}</h1>
                    <p className="text-sm text-muted-foreground">
                      {vendor.legalName} · {vendor.country}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    variant={
                      getStatusColor(vendor.decision || vendor.status) as
                        | "default"
                        | "secondary"
                        | "destructive"
                        | "outline"
                        | "success"
                        | "warning"
                    }
                    className="text-sm px-3 py-1"
                  >
                    {(vendor.decision || vendor.status)
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (c) => c.toUpperCase())}
                  </Badge>
                  {vendor.riskScore != null && (
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "text-lg font-bold",
                          getRiskColor(riskScore)
                        )}
                      >
                        {riskScore}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Risk Score
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="validation">Validation</TabsTrigger>
              <TabsTrigger value="audit">Audit Trail</TabsTrigger>
            </TabsList>

            {/* OVERVIEW TAB */}
            <TabsContent value="overview" className="space-y-6">
              {/* Company Info */}
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-indigo-500" />
                      Company Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="grid grid-cols-2 gap-4">
                      <InfoField label="Company Name" value={vendor.companyName} icon={Building2} />
                      <InfoField label="Legal Name" value={vendor.legalName} />
                      <InfoField label="Country" value={vendor.country} icon={MapPin} />
                      <InfoField label="Registration #" value={vendor.registrationNumber} />
                      <InfoField label="Tax ID" value={vendor.taxId} icon={FileText} />
                      <InfoField label="Tax Type" value={vendor.taxType} />
                    </dl>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Mail className="h-4 w-4 text-blue-500" />
                      Contact & Banking
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="grid grid-cols-2 gap-4">
                      <InfoField label="Email" value={vendor.email} icon={Mail} />
                      <InfoField label="Phone" value={vendor.phone} icon={Phone} />
                      <div className="col-span-2">
                        <InfoField label="Address" value={vendor.address} icon={MapPin} />
                      </div>
                      <InfoField label="Bank Account" value={vendor.bankAccountName} icon={Landmark} />
                      <InfoField label="IFSC/SWIFT" value={vendor.ifscSwift} />
                      {vendor.website && (
                        <div className="col-span-2">
                          <InfoField label="Website" value={vendor.website} icon={Globe} />
                        </div>
                      )}
                    </dl>
                  </CardContent>
                </Card>
              </div>

              {/* Decision Card */}
              {(vendor.decision || vendor.reasoning) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Brain className="h-4 w-4 text-purple-500" />
                      AI Decision
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Risk Score Bar */}
                    {vendor.riskScore != null && (
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-muted-foreground">
                            Risk Score
                          </span>
                          <span
                            className={cn("font-bold", getRiskColor(riskScore))}
                          >
                            {riskScore}/100
                          </span>
                        </div>
                        <Progress
                          value={riskScore}
                          className="h-3"
                          indicatorClassName={getRiskBgColor(riskScore)}
                        />
                      </div>
                    )}

                    {(() => {
                      const displayIssues = cleanAndFormatReasonsForUI(vendor);
                      return displayIssues.length > 0 ? (
                        <div>
                          <h4 className="text-sm font-semibold mb-2">Issues</h4>
                          <div className="space-y-1.5">
                            {displayIssues.map((issue, i) => (
                              <div
                                key={i}
                                className="flex items-start gap-2 text-xs"
                              >
                                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                                <span className="text-muted-foreground">
                                  {issue}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null;
                    })()}

                    {vendor.reasoning && (
                      <div className="mt-4">
                        <h4 className="text-sm font-semibold mb-2">Analysis details</h4>
                        <ReasoningRenderer reasoning={vendor.reasoning} vendor={vendor} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* DOCUMENTS TAB */}
            <TabsContent value="documents" className="space-y-4">
              {vendor.documents.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-sm text-muted-foreground">
                      No documents uploaded
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {vendor.documents.map((doc, i) => (
                    <motion.div
                      key={doc.id || i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Card className="h-full">
                        <CardContent className="p-5">
                          <div className="flex items-start gap-3 mb-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                              {doc.fileType?.startsWith("image") ? (
                                <Eye className="h-5 w-5 text-muted-foreground" />
                              ) : (
                                <FileText className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">
                                {doc.fileName}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge
                                  variant="secondary"
                                  className="text-[10px]"
                                >
                                  {doc.documentType}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground">
                                  {doc.uploadedAt
                                    ? formatDate(doc.uploadedAt)
                                    : ""}
                                </span>
                              </div>
                            </div>
                          </div>

                          {doc.extractedText && (
                            <details className="group">
                              <summary className="text-xs text-indigo-500 cursor-pointer hover:text-indigo-400 flex items-center gap-1">
                                <ChevronRight className="h-3 w-3 group-open:rotate-90 transition-transform" />
                                View Extracted Text
                              </summary>
                              <div className="mt-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground font-mono max-h-40 overflow-y-auto leading-relaxed">
                                {doc.extractedText}
                              </div>
                            </details>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* VALIDATION TAB */}
            <TabsContent value="validation" className="space-y-3">
              {vendor.validationSteps.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <Shield className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-sm text-muted-foreground">
                      No validation data available
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-[23px] top-8 bottom-8 w-px bg-border" />

                  <div className="space-y-3">
                    {vendor.validationSteps.map((step, i) => {
                      const isExpanded = expandedSteps.has(step.name);
                      return (
                        <motion.div
                          key={step.name}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                        >
                          <div
                            className={cn(
                              "relative rounded-xl border p-4 ml-12 cursor-pointer transition-all hover:shadow-sm",
                              step.status === "passed" && "border-emerald-500/20 bg-emerald-500/5",
                              step.status === "failed" && "border-red-500/20 bg-red-500/5",
                              step.status === "warning" && "border-amber-500/20 bg-amber-500/5",
                              step.status === "running" && "border-blue-500/20 bg-blue-500/5",
                              !["passed", "failed", "warning", "running"].includes(step.status) && "border-border"
                            )}
                            onClick={() => step.details && toggleStep(step.name)}
                          >
                            {/* Timeline dot */}
                            <div className="absolute -left-[37px] top-4 z-10 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-background border-2 border-border">
                              <StatusIcon status={step.status} />
                            </div>

                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="text-sm font-semibold">
                                  {step.name}
                                </h4>
                                {step.message && (
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {step.message}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                {step.duration != null && (
                                  <span className="text-xs font-mono text-muted-foreground">
                                    {formatDuration(step.duration)}
                                  </span>
                                )}
                                {step.timestamp && (
                                  <span className="text-[10px] text-muted-foreground hidden sm:inline">
                                    {new Date(step.timestamp).toLocaleTimeString()}
                                  </span>
                                )}
                                {step.details && (
                                  isExpanded ? (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                  )
                                )}
                              </div>
                            </div>

                            {isExpanded && step.details && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                className="overflow-hidden"
                              >
                                <Separator className="my-3" />
                                <StepDetailsRenderer stepName={step.name} detailsStr={step.details} vendor={vendor} />
                              </motion.div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* AUDIT TRAIL TAB */}
            <TabsContent value="audit" className="space-y-3">
              {vendor.auditTrail.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <Clock className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-sm text-muted-foreground">
                      No audit entries yet
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="relative">
                  <div className="absolute left-[7px] top-4 bottom-4 w-px bg-border" />

                  <div className="space-y-4">
                    {vendor.auditTrail.map((entry, i) => (
                      <motion.div
                        key={entry.id || i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="relative pl-8"
                      >
                        {/* Dot */}
                        <div className="absolute left-0 top-1.5 h-[14px] w-[14px] rounded-full bg-background border-2 border-primary" />

                        <div className="rounded-lg border border-border bg-card p-4">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">
                              {entry.action}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {formatDate(entry.timestamp)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {entry.details}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Vendor Response Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8"
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Mail className="h-4 w-4 text-indigo-500" />
                    Vendor Communication
                  </CardTitle>
                  <CardDescription>
                    Auto-generated response based on the decision
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={copyToClipboard}>
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadAsText}>
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg bg-muted/50 border border-border p-4 font-mono text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {communication}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

function StepDetailsRenderer({ stepName, detailsStr, vendor }: { stepName: string; detailsStr: string; vendor: VendorDetail }) {
  try {
    const details = JSON.parse(detailsStr);
    
    if (stepName === "Company Name Match" && details.companyName) {
      const isMatch = details.status === "MATCH";
      const isWarning = details.status === "WARNING";
      const isFailed = details.status === "FAILED";

      return (
        <div className="space-y-4 text-xs mt-3">
          {/* Result Card */}
          <div className={cn(
            "rounded-lg border p-3 flex items-start gap-3",
            isMatch && "bg-emerald-500/5 border-emerald-500/10 text-emerald-800 dark:text-emerald-300",
            isWarning && "bg-amber-500/5 border-amber-500/10 text-amber-800 dark:text-amber-300",
            isFailed && "bg-red-500/5 border-red-500/10 text-red-800 dark:text-red-300"
          )}>
            {isMatch ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
            ) : isWarning ? (
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
            )}
            <div>
              <p className="font-bold">
                {isMatch
                  ? "Company name matches the legal entity after normalization."
                  : isWarning
                  ? "Partial match between company name and legal entity."
                  : "Significant mismatch between company name and legal entity."}
              </p>
              {details.reason && (
                <p className="text-[10px] text-muted-foreground mt-0.5 italic">{details.reason}</p>
              )}
            </div>
          </div>

          {/* Normalization Comparison Card */}
          <div className="rounded-lg border bg-card p-3.5 space-y-3 shadow-none">
            <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Normalized Comparison Detail</h5>
            <div className="grid gap-3 sm:grid-cols-2 text-xs">
              <div className="p-2.5 rounded border bg-muted/10 space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Submitted Company Name</span>
                <p className="font-semibold text-card-foreground">{details.companyName}</p>
                <div className="pt-1.5 border-t border-border/50 text-[10px] flex items-center justify-between text-muted-foreground mt-1.5">
                  <span>Normalized:</span>
                  <span className="font-mono text-indigo-600 bg-indigo-500/10 px-1.5 py-0.2 rounded font-bold">{details.normalizedCompanyName}</span>
                </div>
              </div>
              <div className="p-2.5 rounded border bg-muted/10 space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Official Legal Name</span>
                <p className="font-semibold text-card-foreground">{details.legalName}</p>
                <div className="pt-1.5 border-t border-border/50 text-[10px] flex items-center justify-between text-muted-foreground mt-1.5">
                  <span>Normalized:</span>
                  <span className="font-mono text-indigo-600 bg-indigo-500/10 px-1.5 py-0.2 rounded font-bold">{details.normalizedLegalName}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-2 border-t text-xs">
              <span className="text-muted-foreground font-semibold">Normalized Fuzzy Similarity:</span>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "font-bold font-mono text-sm",
                  isMatch && "text-emerald-500",
                  isWarning && "text-amber-500",
                  isFailed && "text-red-500"
                )}>
                  {details.similarityScore}%
                </span>
                <Badge variant={isMatch ? "success" : isFailed ? "destructive" : "warning"} className="text-[10px] uppercase font-bold px-2 py-0.5">
                  {details.status}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (stepName === "Document Verification" && details.fieldMatches) {
      const matches = details.fieldMatches as Array<{
        fieldName: string;
        expectedValue: string;
        foundValue: string | null;
        status: "match" | "mismatch" | "not_found";
        reasoning: string;
        sourceDocument: string | null;
        isCritical: boolean;
      }>;

      const crossDoc = details.crossDocConsistency || {
        status: "consistent",
        details: "All uploaded documents belong to the same organization. This demonstrates internal consistency among the uploaded documents."
      };

      const transparency = details.ocrTransparency || [];

      const verifiedCount = matches.length;
      const matchedCount = matches.filter(m => m.status === "match").length;
      const mismatchedCount = matches.filter(m => m.status === "mismatch").length;
      const notFoundCount = matches.filter(m => m.status === "not_found").length;

      const formatFieldName = (name: string) => {
        if (name === "taxId") return "GST Number";
        if (name === "registrationNumber") return "CIN / Registration No";
        if (name === "bankAccountName") return "Account Holder Name";
        if (name === "bankAccountNumber") return "Account Number";
        if (name === "ifscSwift") return "IFSC / SWIFT Code";
        return name
          .replace(/([A-Z])/g, " $1")
          .replace(/^./, (str) => str.toUpperCase());
      };

      return (
        <div className="space-y-6 text-sm mt-4">
          {/* Document Verification Summary Card */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border bg-card p-4 flex flex-col justify-between shadow-sm">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Fields Verified</span>
              <span className="text-2xl font-bold text-card-foreground mt-1">{verifiedCount}</span>
            </div>
            <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/5 p-4 flex flex-col justify-between shadow-sm">
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Matched Fields</span>
              <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{matchedCount}</span>
            </div>
            <div className="rounded-xl border border-red-500/10 bg-red-500/5 p-4 flex flex-col justify-between shadow-sm">
              <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Mismatched Fields</span>
              <span className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{mismatchedCount}</span>
            </div>
            <div className="rounded-xl border bg-muted/40 p-4 flex flex-col justify-between shadow-sm">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Not Present</span>
              <span className="text-2xl font-bold text-muted-foreground mt-1">{notFoundCount}</span>
            </div>
          </div>

          {/* Overall Result Banner */}
          <div className={cn(
            "rounded-xl border p-4 flex items-center justify-between shadow-sm",
            details.aiStatus === "mismatch" ? "bg-red-500/5 border-red-500/10 text-red-700 dark:text-red-300" : "bg-emerald-500/5 border-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          )}>
            <div className="flex items-center gap-3">
              {details.aiStatus === "mismatch" ? (
                <XCircle className="h-6 w-6 text-red-500 shrink-0" />
              ) : (
                <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0" />
              )}
              <div>
                <p className="font-bold text-sm">Verification Result: {details.aiStatus === "mismatch" ? "FAILED" : "PASSED"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{details.reasoning}</p>
              </div>
            </div>
            <Badge variant={details.aiStatus === "mismatch" ? "destructive" : "success"} className="text-xs uppercase font-bold px-3 py-1">
              {details.aiStatus === "mismatch" ? "REJECTED" : "VERIFIED"}
            </Badge>
          </div>

          {/* Field Comparison Table */}
          <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
            <div className="p-4 border-b bg-muted/20">
              <h4 className="text-xs font-bold text-card-foreground uppercase tracking-wider">Field-Level Reconciliation Table</h4>
              <p className="text-[10px] text-muted-foreground mt-0.5">Auditable verification of entered data points against extracted document metrics.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b bg-muted/10 text-muted-foreground font-semibold uppercase text-[10px]">
                    <th className="p-3">Field</th>
                    <th className="p-3">Submitted</th>
                    <th className="p-3">Document Value</th>
                    <th className="p-3">Source Document</th>
                    <th className="p-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {matches.map((m) => {
                    const statusBadge = () => {
                      if (m.status === "match") {
                        return <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">🟢 Verified</span>;
                      }
                      if (m.status === "mismatch") {
                        return m.isCritical
                          ? <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-bold">🔴 Critical Mismatch</span>
                          : <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold">🔵 Informational</span>;
                      }
                      return <span className="inline-flex items-center gap-1 text-muted-foreground italic text-amber-600">🟡 Not Verified</span>;
                    };

                    return (
                      <tr key={m.fieldName} className="hover:bg-muted/10 transition-colors">
                        <td className="p-3 font-semibold text-card-foreground min-w-[140px]">
                          {formatFieldName(m.fieldName)}
                          {m.isCritical && (
                            <span className="ml-1.5 inline-flex items-center text-[9px] font-bold text-red-500 bg-red-500/10 px-1.5 py-0.2 rounded uppercase">Critical</span>
                          )}
                        </td>
                        <td className="p-3 font-mono text-muted-foreground break-all max-w-[200px]" title={m.expectedValue}>
                          {m.expectedValue || "—"}
                        </td>
                        <td className="p-3 font-mono text-muted-foreground break-all max-w-[200px]" title={m.foundValue || ""}>
                          {m.status === "not_found" ? (
                            <span className="text-muted-foreground/50 italic">Not present in uploaded documents.</span>
                          ) : (
                            m.foundValue || "—"
                          )}
                        </td>
                        <td className="p-3 text-muted-foreground font-medium max-w-[150px] truncate" title={m.sourceDocument || ""}>
                          {m.sourceDocument || "—"}
                        </td>
                        <td className="p-3 text-right shrink-0 whitespace-nowrap">
                          {statusBadge()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cross Document Consistency */}
          <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="text-xs font-bold text-card-foreground uppercase tracking-wider flex items-center gap-2">
                <Shield className="h-4 w-4 text-indigo-500 shrink-0" />
                Cross-Document Name Consistency
              </h4>
              <Badge variant={crossDoc.status === "consistent" ? "success" : "destructive"} className="text-[10px] uppercase font-bold">
                {crossDoc.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{crossDoc.details}</p>
            {crossDoc.documentCompanies && crossDoc.documentCompanies.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-2 mt-2">
                {crossDoc.documentCompanies.map((c: any, idx: number) => (
                  <div key={idx} className="p-2.5 rounded-lg border bg-muted/20 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-card-foreground truncate max-w-[200px]" title={c.docName}>{c.docName}</p>
                      <p className="text-[10px] text-muted-foreground/80 mt-0.5">Type: {c.docType}</p>
                    </div>
                    <span className="font-mono text-[10px] font-semibold text-indigo-600 bg-indigo-500/10 px-2 py-0.5 rounded truncate max-w-[180px]" title={c.companyName}>
                      {c.companyName || "No name parsed"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* OCR Transparency */}
          {transparency.length > 0 && (
            <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
              <h4 className="text-xs font-bold text-card-foreground uppercase tracking-wider flex items-center gap-2">
                <Building2 className="h-4 w-4 text-indigo-500 shrink-0" />
                OCR Document Intelligence Parser Log
              </h4>
              <div className="grid gap-3 sm:grid-cols-2">
                {transparency.map((t: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-lg border bg-muted/10 space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-card-foreground text-xs truncate max-w-[220px]" title={t.fileName}>{t.fileName}</p>
                        <span className={cn(
                          "text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide",
                          t.status.includes("✓") ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"
                        )}>
                          {t.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Type: {t.docType}</p>
                    </div>
                    <div className="pt-2 border-t border-border/50">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Extracted Fields</p>
                      <div className="flex flex-wrap gap-1">
                        {t.fieldsExtracted.map((f: string, i: number) => (
                          <span key={i} className="text-[9px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground border border-border/50 font-medium">
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }
  } catch (e) {
    // Fallback
  }

  return (
    <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap bg-card/50 rounded-lg p-3 leading-relaxed">
      {detailsStr}
    </pre>
  );
}

function ReasoningRenderer({ reasoning, vendor }: { reasoning: string; vendor: VendorDetail }) {
  if (!reasoning) return null;

  const lines = reasoning.split("\n").map(l => l.trim()).filter(Boolean);
  const checks: Array<{ symbol: string; text: string }> = [];

  for (const line of lines) {
    if (line.startsWith("=== ") || line.startsWith("Risk Score:") || line.startsWith("Decision:") || line.toLowerCase().startsWith("risk factors:")) {
      continue;
    }
    if (line.startsWith("-") || line.startsWith("•")) {
      continue;
    }

    if (line.startsWith("✓")) {
      checks.push({ symbol: "✓", text: line.substring(1).trim() });
    } else if (line.startsWith("✗")) {
      checks.push({ symbol: "✗", text: line.substring(1).trim() });
    } else if (line.startsWith("⚠")) {
      checks.push({ symbol: "⚠", text: line.substring(1).trim() });
    } else if (line.startsWith("X") || line.startsWith("x")) {
      checks.push({ symbol: "✗", text: line.substring(1).trim() });
    } else {
      checks.push({ symbol: "info", text: line });
    }
  }

  // Build the dynamic Risk Breakdown list
  const riskFactorsList: Array<{ name: string; score: number; description: string }> = [];

  // 1. Company Name Match step
  const nameStep = vendor.validationSteps?.find(s => s.name === "Company Name Match");
  const nameScore = nameStep
    ? nameStep.status.toUpperCase() === "FAILED"
      ? 20
      : nameStep.status.toUpperCase() === "WARNING"
      ? 10
      : 0
    : 0;
  riskFactorsList.push({
    name: "Company Name Similarity",
    score: nameScore,
    description: nameStep?.message || "Company name is consistent with legal name."
  });

  // 2. Tax ID Validation step
  const taxIdStep = vendor.validationSteps?.find(s => s.name === "Tax ID Validation");
  const taxIdScore = taxIdStep
    ? taxIdStep.status.toUpperCase() === "FAILED"
      ? taxIdStep.message?.includes("format") ? 15 : 25
      : 0
    : 0;
  if (taxIdScore > 0 || (taxIdStep && taxIdStep.status.toUpperCase() === "FAILED")) {
    riskFactorsList.push({
      name: "Tax ID Validation",
      score: taxIdScore || 15,
      description: taxIdStep?.message || "Tax ID format is invalid."
    });
  }

  // 3. Bank Account Consistency step
  const bankStep = vendor.validationSteps?.find(s => s.name === "Bank Account Consistency");
  const bankScore = bankStep
    ? bankStep.status.toUpperCase() === "FAILED"
      ? 15
      : bankStep.status.toUpperCase() === "WARNING"
      ? 10
      : 0
    : 0;
  riskFactorsList.push({
    name: "Bank Account Consistency",
    score: bankScore,
    description: bankStep?.message || "Bank account holder name matches company details."
  });

  // 4. Document Verification mismatches
  const docStep = vendor.validationSteps?.find(s => s.name === "Document Verification");
  if (docStep && docStep.details) {
    try {
      const details = JSON.parse(docStep.details);
      if (details.fieldMatches) {
        const matches = details.fieldMatches as Array<{
          fieldName: string;
          expectedValue: string;
          foundValue: string | null;
          status: "match" | "mismatch" | "not_found";
          reasoning: string;
          isCritical: boolean;
        }>;

        matches.forEach(m => {
          if (m.isCritical) {
            let score = 0;
            if (m.status === "mismatch") {
              if (m.fieldName === "taxId") score = 20;
              else if (m.fieldName === "registrationNumber") score = 15;
              else if (m.fieldName === "bankAccountNumber") score = 10;
              else score = 10;
            }

            if (score > 0 || m.status === "mismatch" || m.status === "match") {
              const label = m.fieldName === "taxId" ? "GST Number"
                : m.fieldName === "registrationNumber" ? "Registration Number"
                : m.fieldName === "bankAccountNumber" ? "Bank Account Number"
                : m.fieldName.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase());
              
              riskFactorsList.push({
                name: `${label} verification`,
                score,
                description: m.status === "match" ? "Verified" : m.reasoning
              });
            }
          }
        });
      }
    } catch (e) {
      riskFactorsList.push({
        name: "Document Verification mismatch",
        score: 45,
        description: docStep.message || "Significant inconsistencies detected between documents and vendor info."
      });
    }
  }

  // 5. Duplicate Detection
  const dupStep = vendor.validationSteps?.find(s => s.name === "Duplicate Detection");
  const dupScore = dupStep && (dupStep.status.toUpperCase() === "FAILED" || dupStep.status.toUpperCase() === "WARNING") ? 25 : 0;
  riskFactorsList.push({
    name: "Duplicate Vendor",
    score: dupScore,
    description: (dupScore > 0 && dupStep) ? dupStep.message || "Potential duplicate vendor detected." : "No duplicate vendors detected."
  });

  const totalRiskScore = riskFactorsList.reduce((acc, curr) => acc + curr.score, 0);

  return (
    <div className="space-y-4">
      {/* Checks list */}
      <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
        <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Automated Rules Checklist</h5>
        <div className="grid gap-3 sm:grid-cols-2">
          {checks.map((check, idx) => (
            <div key={idx} className="flex items-start gap-2 text-xs">
              {check.symbol === "✓" && (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              )}
              {check.symbol === "✗" && (
                <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              )}
              {check.symbol === "⚠" && (
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              )}
              {check.symbol === "info" && (
                <Shield className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
              )}
              <span className="text-muted-foreground leading-relaxed">
                {check.text}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Risk Factors Breakdown */}
      <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b pb-2">
          <h5 className="text-[10px] font-bold text-card-foreground uppercase tracking-wider">Risk Factors Breakdown</h5>
          <span className="text-xs font-bold text-red-500">Total Score Contribution: +{totalRiskScore}</span>
        </div>
        <div className="divide-y divide-border/50">
          {riskFactorsList.map((factor, idx) => (
            <div key={idx} className="py-2.5 flex items-start justify-between text-xs gap-4">
              <div className="space-y-0.5">
                <p className="font-semibold text-card-foreground">{factor.name}</p>
                <p className="text-[10px] text-muted-foreground">{factor.description}</p>
              </div>
              <span className={cn(
                "font-mono font-bold text-xs px-2 py-0.5 rounded",
                factor.score > 0 ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-500"
              )}>
                {factor.score > 0 ? `+${factor.score}` : "0"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
