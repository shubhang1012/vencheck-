"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Building2,
  FileText,
  Mail,
  Phone,
  Globe,
  Landmark,
  MapPin,
  Send,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileUploader,
  type UploadedFile,
} from "@/components/vendor/file-uploader";
import { cn } from "@/lib/utils";

const countries = [
  "United States",
  "United Kingdom",
  "India",
  "Germany",
  "Canada",
  "Australia",
  "France",
  "Japan",
  "Singapore",
  "United Arab Emirates",
  "Netherlands",
  "Brazil",
  "South Korea",
  "Switzerland",
  "Mexico",
  "Italy",
  "Spain",
  "Sweden",
  "China",
  "South Africa",
];

const taxTypes = [
  { value: "GST", label: "GST (Goods & Services Tax)" },
  { value: "EIN", label: "EIN (Employer Identification Number)" },
  { value: "VAT", label: "VAT (Value Added Tax)" },
  { value: "PAN", label: "PAN (Permanent Account Number)" },
  { value: "TIN", label: "TIN (Tax Identification Number)" },
  { value: "Other", label: "Other" },
];

interface FormData {
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
  website: string;
}

interface FormErrors {
  [key: string]: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formData, setFormData] = useState<FormData>({
    companyName: "",
    legalName: "",
    country: "",
    registrationNumber: "",
    taxId: "",
    taxType: "",
    email: "",
    phone: "",
    address: "",
    bankAccountName: "",
    bankAccountNumber: "",
    ifscSwift: "",
    website: "",
  });

  const updateField = useCallback(
    (field: keyof FormData, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      if (errors[field]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    },
    [errors]
  );

  const handleFilesChange = useCallback(
    (newFiles: UploadedFile[] | ((prev: UploadedFile[]) => UploadedFile[])) => {
      if (typeof newFiles === "function") {
        setFiles(newFiles);
      } else {
        setFiles(newFiles);
      }
    },
    []
  );

  const validateStep1 = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.companyName.trim()) newErrors.companyName = "Company name is required";
    if (!formData.legalName.trim()) newErrors.legalName = "Legal entity name is required";
    if (!formData.country) newErrors.country = "Country is required";
    if (!formData.registrationNumber.trim()) newErrors.registrationNumber = "Registration number is required";
    
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email address";
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (formData.country === "India") {
      const cleanPhone = formData.phone.replace(/\D/g, "");
      if (cleanPhone.length !== 10) {
        newErrors.phone = "Phone number must be exactly 10 digits for India";
      }
    }

    if (!formData.address.trim()) newErrors.address = "Address is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.taxId.trim()) newErrors.taxId = "Tax ID is required";
    if (!formData.taxType) newErrors.taxType = "Tax type is required";
    if (!formData.bankAccountName.trim()) newErrors.bankAccountName = "Account holder name is required";
    if (!formData.bankAccountNumber.trim()) newErrors.bankAccountNumber = "Account number is required";
    if (!formData.ifscSwift.trim()) newErrors.ifscSwift = "IFSC/SWIFT code is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (validateStep1()) {
        setStep(2);
      } else {
        // Find which validation error was hit to show precise toast
        const newErrors: FormErrors = {};
        if (!formData.email.trim()) {
          newErrors.email = "Email is required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          newErrors.email = "Invalid email address";
        }
        
        if (formData.country === "India" && formData.phone.trim().length > 0) {
          const cleanPhone = formData.phone.replace(/\D/g, "");
          if (cleanPhone.length !== 10) {
            newErrors.phone = "Phone number must be exactly 10 digits for India";
          }
        }

        if (newErrors.email === "Invalid email address") {
          toast.error("Please enter a valid email address");
        } else if (newErrors.phone?.includes("10 digits")) {
          toast.error("Please enter a valid 10-digit phone number for India");
        } else {
          toast.error("Please fill in all required company details");
        }
      }
    } else if (step === 2) {
      if (validateStep2()) setStep(3);
      else toast.error("Please fill in all banking and tax credentials");
    }
  };

  const handlePrevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep1() || !validateStep2()) {
      if (!validateStep1()) {
        const isEmailInvalid = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) && formData.email.trim().length > 0;
        const isPhoneInvalid = formData.country === "India" && formData.phone.replace(/\D/g, "").length !== 10 && formData.phone.trim().length > 0;
        if (isEmailInvalid) {
          toast.error("Please enter a valid email address");
        } else if (isPhoneInvalid) {
          toast.error("Please enter a valid 10-digit phone number for India");
        } else {
          toast.error("Please resolve any form validation issues");
        }
      } else {
        toast.error("Please resolve any form validation issues");
      }
      return;
    }

    if (files.length === 0) {
      toast.error("Please upload at least one compliance document for review");
      return;
    }

    setIsSubmitting(true);

    try {
      const DOC_TYPE_MAP: Record<string, string> = {
        "GST Certificate": "GST_CERTIFICATE",
        "Certificate of Incorporation": "CERTIFICATE_OF_INCORPORATION",
        "Cancelled Cheque": "CANCELLED_CHEQUE",
        "PAN Card": "PAN_CARD",
        "Tax Registration": "GST_CERTIFICATE",
        "Business License": "CERTIFICATE_OF_INCORPORATION",
        "GST_CERTIFICATE": "GST_CERTIFICATE",
        "CERTIFICATE_OF_INCORPORATION": "CERTIFICATE_OF_INCORPORATION",
        "CANCELLED_CHEQUE": "CANCELLED_CHEQUE",
        "PAN_CARD": "PAN_CARD",
        "Other": "GST_CERTIFICATE",
      };
      
      const uploadedDocuments: Array<{
        type: string;
        fileName: string;
        filePath: string;
        mimeType: string;
        extractedText?: string;
      }> = [];

      for (const uploadFile of files) {
        if (uploadFile.status === "complete") {
          const fileFormData = new FormData();
          fileFormData.append("file", uploadFile.file);
          fileFormData.append("documentType", uploadFile.documentType || "Other");

          const uploadRes = await fetch("/api/upload", {
            method: "POST",
            body: fileFormData,
          });

          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            const fileInfo = uploadData.file || {};
            const rawDocType = uploadFile.documentType || "Other";
            const enumDocType = DOC_TYPE_MAP[rawDocType] || "GST_CERTIFICATE";
            uploadedDocuments.push({
              type: enumDocType,
              fileName: fileInfo.fileName || uploadFile.file.name,
              filePath: fileInfo.filePath || `/uploads/${uploadFile.file.name}`,
              mimeType: fileInfo.mimeType || uploadFile.file.type,
              extractedText: fileInfo.extractedText || undefined,
            });
          }
        }
      }

      const res = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          documents: uploadedDocuments,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to submit vendor data");
      }

      const data = await res.json();
      const vendorId = data.vendor?.id || data.id;
      if (!vendorId) throw new Error("No vendor ID returned from server");
      
      toast.success("Vendor details submitted successfully!");
      router.push(`/onboarding/${vendorId}/processing`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to submit vendor details"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { num: 1, label: "Company Profile" },
    { num: 2, label: "Banking & Tax" },
    { num: 3, label: "Documents" },
  ];

  return (
    <div className="min-h-screen py-16 px-4 bg-muted/10">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-10 text-center space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-card-foreground">
            Vendor Intake Portal
          </h1>
          <p className="text-muted-foreground text-xs">
            Submit your profile credentials and attachments for automated audit checks.
          </p>
        </div>

        {/* Wizard Progress Line */}
        <div className="mb-8 flex items-center justify-between relative px-2">
          <div className="absolute left-6 right-6 top-[15px] h-0.5 bg-border -z-10" />
          {steps.map((s) => (
            <div key={s.num} className="flex flex-col items-center gap-1 bg-transparent">
              <div className={cn(
                "w-8 h-8 rounded-full border-2 flex items-center justify-center font-semibold text-xs transition-colors",
                step === s.num && "bg-primary text-primary-foreground border-primary",
                step > s.num && "bg-emerald-500 text-white border-emerald-500",
                step < s.num && "bg-card text-muted-foreground border-border"
              )}>
                {step > s.num ? "✓" : s.num}
              </div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{s.label}</span>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {/* STEP 1: COMPANY PROFILE */}
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <Card className="border shadow-sm">
                <CardHeader className="pb-3 border-b">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-indigo-500" />
                    Organization Profile
                  </CardTitle>
                  <CardDescription className="text-xs">Provide official company and registration parameters.</CardDescription>
                </CardHeader>
                <CardContent className="pt-4 grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="companyName" className="text-xs">Company Name</Label>
                    <Input
                      id="companyName"
                      placeholder="Acme Inc"
                      value={formData.companyName}
                      onChange={(e) => updateField("companyName", e.target.value)}
                      className={errors.companyName ? "border-destructive text-xs" : "text-xs"}
                    />
                    {errors.companyName && <p className="text-[10px] text-destructive">{errors.companyName}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="legalName" className="text-xs">Legal Entity Name</Label>
                    <Input
                      id="legalName"
                      placeholder="Acme Corporation Pvt Ltd"
                      value={formData.legalName}
                      onChange={(e) => updateField("legalName", e.target.value)}
                      className={errors.legalName ? "border-destructive text-xs" : "text-xs"}
                    />
                    {errors.legalName && <p className="text-[10px] text-destructive">{errors.legalName}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="country" className="text-xs">Country</Label>
                    <Select value={formData.country} onValueChange={(val) => updateField("country", val)}>
                      <SelectTrigger className={errors.country ? "border-destructive text-xs font-medium" : "text-xs font-medium"}>
                        <SelectValue placeholder="Select Country" />
                      </SelectTrigger>
                      <SelectContent>
                        {countries.map((c) => (
                          <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.country && <p className="text-[10px] text-destructive">{errors.country}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="registrationNumber" className="text-xs">Registration Number (CIN)</Label>
                    <Input
                      id="registrationNumber"
                      placeholder="Registration Number"
                      value={formData.registrationNumber}
                      onChange={(e) => updateField("registrationNumber", e.target.value)}
                      className={errors.registrationNumber ? "border-destructive text-xs" : "text-xs"}
                    />
                    {errors.registrationNumber && <p className="text-[10px] text-destructive">{errors.registrationNumber}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs">Business Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="finance@acme.com"
                        value={formData.email}
                        onChange={(e) => updateField("email", e.target.value)}
                        className={`pl-9 text-xs ${errors.email ? "border-destructive" : ""}`}
                      />
                    </div>
                    {errors.email && <p className="text-[10px] text-destructive">{errors.email}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-xs">Primary Phone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        id="phone"
                        placeholder="+91 9876500000"
                        value={formData.phone}
                        onChange={(e) => updateField("phone", e.target.value)}
                        className={`pl-9 text-xs ${errors.phone ? "border-destructive" : ""}`}
                      />
                    </div>
                    {errors.phone && <p className="text-[10px] text-destructive">{errors.phone}</p>}
                  </div>

                  <div className="sm:col-span-2 space-y-1.5">
                    <Label htmlFor="address" className="text-xs">Registered Address</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <textarea
                        id="address"
                        placeholder="Full registered address"
                        value={formData.address}
                        onChange={(e) => updateField("address", e.target.value)}
                        rows={2}
                        className={`flex w-full rounded-lg border bg-background px-3 py-2 pl-9 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:opacity-50 resize-none transition-colors ${errors.address ? "border-destructive" : "border-input"}`}
                      />
                    </div>
                    {errors.address && <p className="text-[10px] text-destructive">{errors.address}</p>}
                  </div>

                  <div className="sm:col-span-2 space-y-1.5">
                    <Label htmlFor="website" className="text-xs">Website URL (Optional)</Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        id="website"
                        placeholder="https://www.acme.com"
                        value={formData.website}
                        onChange={(e) => updateField("website", e.target.value)}
                        className="pl-9 text-xs"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end pt-2">
                <Button type="button" onClick={handleNextStep} size="sm" className="px-6 font-semibold">
                  Continue
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: BANKING & TAX */}
          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <Card className="border shadow-sm">
                <CardHeader className="pb-3 border-b">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Landmark className="h-4 w-4 text-emerald-500" />
                    Banking & Tax Information
                  </CardTitle>
                  <CardDescription className="text-xs">Setup bank payout destination and tax identification details.</CardDescription>
                </CardHeader>
                <CardContent className="pt-4 grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="taxType" className="text-xs">Tax Type</Label>
                    <Select value={formData.taxType} onValueChange={(val) => updateField("taxType", val)}>
                      <SelectTrigger className={errors.taxType ? "border-destructive text-xs font-medium" : "text-xs font-medium"}>
                        <SelectValue placeholder="Select Tax Type" />
                      </SelectTrigger>
                      <SelectContent>
                        {taxTypes.map((t) => (
                          <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.taxType && <p className="text-[10px] text-destructive">{errors.taxType}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="taxId" className="text-xs">Tax ID (GSTIN/PAN)</Label>
                    <Input
                      id="taxId"
                      placeholder="Tax Identification Number"
                      value={formData.taxId}
                      onChange={(e) => updateField("taxId", e.target.value)}
                      className={errors.taxId ? "border-destructive text-xs" : "text-xs"}
                    />
                    {errors.taxId && <p className="text-[10px] text-destructive">{errors.taxId}</p>}
                  </div>

                  <div className="sm:col-span-2 space-y-1.5">
                    <Label htmlFor="bankAccountName" className="text-xs">Bank Account Holder Name</Label>
                    <Input
                      id="bankAccountName"
                      placeholder="Name on bank account"
                      value={formData.bankAccountName}
                      onChange={(e) => updateField("bankAccountName", e.target.value)}
                      className={errors.bankAccountName ? "border-destructive text-xs" : "text-xs"}
                    />
                    {errors.bankAccountName && <p className="text-[10px] text-destructive">{errors.bankAccountName}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="bankAccountNumber" className="text-xs">Account Number</Label>
                    <Input
                      id="bankAccountNumber"
                      placeholder="Bank account number"
                      value={formData.bankAccountNumber}
                      onChange={(e) => updateField("bankAccountNumber", e.target.value)}
                      className={errors.bankAccountNumber ? "border-destructive text-xs" : "text-xs"}
                    />
                    {errors.bankAccountNumber && <p className="text-[10px] text-destructive">{errors.bankAccountNumber}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="ifscSwift" className="text-xs">IFSC / SWIFT Code</Label>
                    <Input
                      id="ifscSwift"
                      placeholder="Routing Code"
                      value={formData.ifscSwift}
                      onChange={(e) => updateField("ifscSwift", e.target.value)}
                      className={errors.ifscSwift ? "border-destructive text-xs" : "text-xs"}
                    />
                    {errors.ifscSwift && <p className="text-[10px] text-destructive">{errors.ifscSwift}</p>}
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between pt-2">
                <Button type="button" onClick={handlePrevStep} variant="outline" size="sm" className="px-6 font-semibold">
                  Back
                </Button>
                <Button type="button" onClick={handleNextStep} size="sm" className="px-6 font-semibold">
                  Continue
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: DOCUMENT UPLOAD */}
          {step === 3 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <Card className="border shadow-sm">
                <CardHeader className="pb-3 border-b">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4 text-rose-500" />
                    Compliance Certificates
                  </CardTitle>
                  <CardDescription className="text-xs">Attach registration documents for validation (GST, Cancelled Cheque, PAN, COI).</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <FileUploader files={files} onFilesChange={handleFilesChange} />
                </CardContent>
              </Card>

              <div className="flex justify-between pt-2">
                <Button type="button" onClick={handlePrevStep} variant="outline" size="sm" className="px-6 font-semibold">
                  Back
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="px-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 font-semibold"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin shrink-0 mr-1.5" />
                      Submitting Details...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 shrink-0 mr-1.5" />
                      Submit Verification
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </form>
      </div>
    </div>
  );
}
